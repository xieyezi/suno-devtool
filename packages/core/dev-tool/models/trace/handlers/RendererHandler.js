import * as Platform from "../../../core/platform/platform.js";
import * as Helpers from "../helpers/helpers.js";
import { data as metaHandlerData } from "./MetaHandler.js";
import {
  buildStackTraceAsCallFramesFromId,
  data as samplesData,
  getAllHotFunctionsBetweenTimestamps
} from "./SamplesHandler.js";
import { KnownEventName, KNOWN_EVENTS, HandlerState } from "./types.js";
import * as Types from "../types/types.js";
const processes = /* @__PURE__ */ new Map();
const traceEventToNode = /* @__PURE__ */ new Map();
const allRendererEvents = [];
let handlerState = HandlerState.UNINITIALIZED;
const makeRendererProcess = () => ({
  url: null,
  isOnMainFrame: false,
  threads: /* @__PURE__ */ new Map()
});
const makeRendererThread = () => ({
  name: null,
  events: []
});
const makeEmptyRendererEventTree = () => ({
  nodes: /* @__PURE__ */ new Map(),
  roots: /* @__PURE__ */ new Set(),
  maxDepth: 0
});
const makeEmptyRendererEventNode = (eventIndex) => ({
  eventIndex,
  parentId: null,
  childrenIds: /* @__PURE__ */ new Set(),
  depth: 0
});
const makeRendererEventNodeIdGenerator = () => {
  let i = 0;
  return () => i++;
};
const getOrCreateRendererProcess = (processes2, pid) => {
  return Platform.MapUtilities.getWithDefault(processes2, pid, makeRendererProcess);
};
const getOrCreateRendererThread = (process, tid) => {
  return Platform.MapUtilities.getWithDefault(process.threads, tid, makeRendererThread);
};
export function reset() {
  processes.clear();
  traceEventToNode.clear();
  allRendererEvents.length = 0;
  handlerState = HandlerState.UNINITIALIZED;
}
export function initialize() {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error("Renderer Handler was not reset");
  }
  handlerState = HandlerState.INITIALIZED;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Renderer Handler is not initialized");
  }
  if (Types.TraceEvents.isTraceEventInstant(event) || Types.TraceEvents.isTraceEventComplete(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.events.push(event);
    allRendererEvents.push(event);
  }
}
export async function finalize() {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Renderer Handler is not initialized");
  }
  const { mainFrameId, rendererProcessesByFrame, threadsInProcess } = metaHandlerData();
  assignMeta(processes, mainFrameId, rendererProcessesByFrame, threadsInProcess);
  sanitizeProcesses(processes);
  buildHierarchy(processes, { filter: KNOWN_EVENTS });
  sanitizeThreads(processes);
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("Renderer Handler is not finalized");
  }
  return {
    processes: new Map(processes),
    traceEventToNode: new Map(traceEventToNode),
    allRendererEvents: [...allRendererEvents]
  };
}
export function assignMeta(processes2, mainFrameId, rendererProcessesByFrame, threadsInProcess) {
  assignOrigin(processes2, mainFrameId, rendererProcessesByFrame);
  assignIsMainFrame(processes2, mainFrameId, rendererProcessesByFrame);
  assignThreadName(processes2, rendererProcessesByFrame, threadsInProcess);
}
export function assignOrigin(processes2, mainFrameId, rendererProcessesByFrame) {
  for (const [frameId, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid, processInfo] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes2, pid);
      try {
        if (process.url === null || frameId === mainFrameId) {
          process.url = new URL(processInfo.frame.url);
        }
      } catch (e) {
      }
    }
  }
}
export function assignIsMainFrame(processes2, mainFrameId, rendererProcessesByFrame) {
  for (const [frameId, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes2, pid);
      if (frameId === mainFrameId) {
        process.isOnMainFrame = true;
      }
    }
  }
}
export function assignThreadName(processes2, rendererProcessesByFrame, threadsInProcess) {
  for (const [, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes2, pid);
      for (const [tid, threadInfo] of threadsInProcess.get(pid) ?? []) {
        const thread = getOrCreateRendererThread(process, tid);
        thread.name = threadInfo?.args.name ?? `${tid}`;
      }
    }
  }
}
export function sanitizeProcesses(processes2) {
  for (const [pid, process] of processes2) {
    if (process.url === null || process.url.protocol === "about:") {
      processes2.delete(pid);
    }
  }
}
export function sanitizeThreads(processes2) {
  for (const [, process] of processes2) {
    for (const [tid, thread] of process.threads) {
      if (!thread.tree?.roots.size) {
        process.threads.delete(tid);
      }
    }
  }
}
export function buildHierarchy(processes2, options) {
  for (const [, process] of processes2) {
    for (const [, thread] of process.threads) {
      Helpers.Trace.sortTraceEventsInPlace(thread.events);
      thread.tree = treify(thread.events, options);
    }
  }
}
export function treify(events, options) {
  const stack = [];
  const tree = makeEmptyRendererEventTree();
  const makeRendererEventNodeId = makeRendererEventNodeIdGenerator();
  let lastScheduleStyleRecalcEvent = null;
  let lastInvalidateLayout = null;
  let lastForcedStyleRecalc = null;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    buildHotFunctionsStackTracesForTask(event);
    if (event.name === KnownEventName.ScheduleStyleRecalculation) {
      lastScheduleStyleRecalcEvent = event;
    }
    if (event.name === KnownEventName.InvalidateLayout) {
      lastInvalidateLayout = event;
    }
    if (event.name === KnownEventName.RecalculateStyles) {
      lastForcedStyleRecalc = event;
    }
    if (!options.filter.has(event.name)) {
      continue;
    }
    const duration = Types.TraceEvents.isTraceEventInstant(event) ? 0 : event.dur;
    if (stack.length === 0) {
      const node2 = makeEmptyRendererEventNode(i);
      const nodeId2 = makeRendererEventNodeId();
      tree.nodes.set(nodeId2, node2);
      tree.roots.add(nodeId2);
      event.totalTime = Types.Timing.MicroSeconds(duration);
      event.selfTime = Types.Timing.MicroSeconds(duration);
      stack.push(nodeId2);
      tree.maxDepth = Math.max(tree.maxDepth, stack.length);
      traceEventToNode.set(event, node2);
      continue;
    }
    const parentNodeId = stack[stack.length - 1];
    if (parentNodeId === void 0) {
      throw new Error("Impossible: no parent node id found in the stack");
    }
    const parentNode = tree.nodes.get(parentNodeId);
    if (!parentNode) {
      throw new Error("Impossible: no parent node exists for the given id");
    }
    const parentEvent = events[parentNode.eventIndex];
    if (!parentEvent) {
      throw new Error("Impossible: no parent event exists for the given node");
    }
    const begin = event.ts;
    const parentBegin = parentEvent.ts;
    const parentDuration = Types.TraceEvents.isTraceEventInstant(parentEvent) ? 0 : parentEvent.dur;
    const end = begin + duration;
    const parentEnd = parentBegin + parentDuration;
    const startsBeforeParent = begin < parentBegin;
    if (startsBeforeParent) {
      throw new Error("Impossible: current event starts before the parent event");
    }
    const startsAfterParent = begin >= parentEnd;
    if (startsAfterParent) {
      stack.pop();
      i--;
      continue;
    }
    const endsAfterParent = end > parentEnd;
    if (endsAfterParent) {
      throw new Error("Impossible: current event starts during the parent event");
    }
    const node = makeEmptyRendererEventNode(i);
    const nodeId = makeRendererEventNodeId();
    tree.nodes.set(nodeId, node);
    node.depth = stack.length;
    node.parentId = parentNodeId;
    parentNode.childrenIds.add(nodeId);
    event.selfTime = Types.Timing.MicroSeconds(duration);
    event.totalTime = Types.Timing.MicroSeconds(duration);
    if (parentEvent.selfTime !== void 0) {
      parentEvent.selfTime = Types.Timing.MicroSeconds(parentEvent.selfTime - event.totalTime);
    }
    stack.push(nodeId);
    tree.maxDepth = Math.max(tree.maxDepth, stack.length);
    traceEventToNode.set(event, node);
    checkIfEventIsForcedLayoutAndStore(event, lastScheduleStyleRecalcEvent, lastInvalidateLayout, lastForcedStyleRecalc);
  }
  return tree;
}
function checkIfEventIsForcedLayoutAndStore(event, lastScheduleStyleRecalcEvent, lastInvalidateLayout, lastForcedStyleRecalc) {
  if (FORCED_LAYOUT_EVENT_NAMES.has(event.name)) {
    if (lastInvalidateLayout) {
      event.initiator = lastInvalidateLayout;
    }
    const lastForcedStyleEndTime = lastForcedStyleRecalc && lastForcedStyleRecalc.ts + (lastForcedStyleRecalc.dur || 0);
    const hasInitiator = lastScheduleStyleRecalcEvent && lastInvalidateLayout && lastForcedStyleEndTime;
    if (hasInitiator && lastForcedStyleEndTime > lastInvalidateLayout.ts) {
      event.initiator = lastScheduleStyleRecalcEvent;
    }
  }
  if (FORCED_RECALC_STYLE_EVENTS.has(event.name)) {
    lastForcedStyleRecalc = event;
    if (lastScheduleStyleRecalcEvent) {
      event.initiator = lastScheduleStyleRecalcEvent;
    }
  }
}
function eventIsLongTask(event, mustBeOnMainFrame) {
  if (event.name !== KnownEventName.RunTask) {
    return false;
  }
  const eventProcess = processes.get(event.pid);
  const isOnMainFrame = Boolean(eventProcess && eventProcess.isOnMainFrame);
  if (!isOnMainFrame && mustBeOnMainFrame) {
    return false;
  }
  const errorTimeThreshold = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(50));
  const eventDuration = Types.TraceEvents.isTraceEventInstant(event) ? 0 : event.dur;
  return eventDuration > errorTimeThreshold;
}
export function buildHotFunctionsStackTracesForTask(task) {
  if (!eventIsLongTask(task, true)) {
    return;
  }
  const { processes: processes2 } = samplesData();
  const thread = processes2.get(task.pid)?.threads.get(task.tid);
  const HOT_FUNCTION_MIN_SELF_PERCENTAGE = 0;
  const calls = thread?.calls;
  const taskStart = task.ts;
  const taskEnd = Types.Timing.MicroSeconds(task.ts + (task.dur || 0));
  const hotFunctions = calls && getAllHotFunctionsBetweenTimestamps(calls, taskStart, taskEnd, HOT_FUNCTION_MIN_SELF_PERCENTAGE);
  const tree = thread?.tree;
  if (!hotFunctions || !tree) {
    return;
  }
  const MAX_HOT_FUNCTION_COUNT = 10;
  task.hotFunctionsStackTraces = hotFunctions.slice(0, MAX_HOT_FUNCTION_COUNT).map((hotFunction) => buildStackTraceAsCallFramesFromId(tree, hotFunction.stackFrame.nodeId).reverse());
}
export const FORCED_LAYOUT_EVENT_NAMES = /* @__PURE__ */ new Set([
  KnownEventName.Layout
]);
export const FORCED_RECALC_STYLE_EVENTS = /* @__PURE__ */ new Set([
  KnownEventName.RecalculateStyles,
  KnownEventName.UpdateLayoutTree
]);
export function deps() {
  return ["Meta", "Samples"];
}
class RendererEventNodeIdTag {
  #tag;
}
//# sourceMappingURL=RendererHandler.js.map
