import * as Platform from "../../../core/platform/platform.js";
import * as Helpers from "../helpers/helpers.js";
import * as Types from "../types/types.js";
import { HandlerState, EventCategory, KNOWN_EVENTS } from "./types.js";
export function sortProfileSamples(samples) {
  samples.sort((a, b) => {
    const aBeginTime = a.ts;
    const bBeginTime = b.ts;
    if (aBeginTime < bBeginTime) {
      return -1;
    }
    if (aBeginTime > bBeginTime) {
      return 1;
    }
    return 0;
  });
}
const KNOWN_BOUNDARIES = /* @__PURE__ */ new Set([
  EventCategory.Other,
  EventCategory.V8,
  EventCategory.Js,
  EventCategory.Gc
]);
const ALLOWED_CALL_FRAME_CODE_TYPES = /* @__PURE__ */ new Set([void 0, "JS"]);
const BANNED_CALL_FRAME_URL_REGS = [/^chrome-extension:\/\//, /^extensions::/];
const SAMPLING_INTERVAL = Types.Timing.MicroSeconds(200);
const events = /* @__PURE__ */ new Map();
const profiles = /* @__PURE__ */ new Map();
const processes = /* @__PURE__ */ new Map();
let handlerState = HandlerState.UNINITIALIZED;
const makeSamplesProcess = () => ({
  threads: /* @__PURE__ */ new Map()
});
const makeSamplesThread = (profile) => ({
  profile
});
const makeEmptyProfileTree = () => ({
  nodes: /* @__PURE__ */ new Map()
});
const makeEmptyProfileNode = (callFrame) => ({
  callFrame,
  parentId: null,
  childrenIds: /* @__PURE__ */ new Set()
});
const makeProfileSample = (nodeId, pid, tid, ts) => ({
  topmostStackFrame: { nodeId },
  tid,
  pid,
  ts
});
const makeProfileCall = (nodeId, sample) => ({
  stackFrame: { nodeId },
  tid: sample.tid,
  pid: sample.pid,
  ts: sample.ts,
  dur: Types.Timing.MicroSeconds(0),
  selfDur: Types.Timing.MicroSeconds(0),
  children: []
});
const makeEmptyProfileFunction = (nodeId) => ({
  stackFrame: { nodeId },
  calls: [],
  durPercent: 0,
  selfDurPercent: 0
});
const getOrCreateSamplesProcess = (processes2, pid) => {
  return Platform.MapUtilities.getWithDefault(processes2, pid, makeSamplesProcess);
};
const getOrCreateSamplesThread = (process, tid, profile) => {
  return Platform.MapUtilities.getWithDefault(process.threads, tid, () => makeSamplesThread(profile));
};
export function reset() {
  events.clear();
  profiles.clear();
  processes.clear();
  handlerState = HandlerState.UNINITIALIZED;
}
export function initialize() {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error("Samples Handler was not reset");
  }
  handlerState = HandlerState.INITIALIZED;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Samples Handler is not initialized");
  }
  if (Types.TraceEvents.isTraceEventProfile(event)) {
    const profile = Platform.MapUtilities.getWithDefault(profiles, event.id, () => ({}));
    profile.head = event;
    return;
  }
  if (Types.TraceEvents.isTraceEventProfileChunk(event)) {
    const profile = Platform.MapUtilities.getWithDefault(profiles, event.id, () => ({}));
    profile.chunks = profile.chunks ?? [];
    profile.chunks.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventComplete(event)) {
    const process = Platform.MapUtilities.getWithDefault(events, event.pid, () => /* @__PURE__ */ new Map());
    const thread = Platform.MapUtilities.getWithDefault(process, event.tid, () => []);
    thread.push(event);
    return;
  }
}
export async function finalize() {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Samples Handler is not initialized");
  }
  buildProcessesAndThreads(profiles, processes);
  buildHierarchy(processes, events);
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("Samples Handler is not finalized");
  }
  return {
    profiles: new Map(profiles),
    processes: new Map(processes)
  };
}
export function buildProcessesAndThreads(profiles2, processes2) {
  for (const [, profile] of profiles2) {
    const { head, chunks } = profile;
    if (!head || !chunks?.length) {
      continue;
    }
    const pid = head.pid;
    const tid = head.tid;
    getOrCreateSamplesThread(getOrCreateSamplesProcess(processes2, pid), tid, profile);
  }
}
export function buildHierarchy(processes2, events2) {
  for (const [pid, process] of processes2) {
    for (const [tid, thread] of process.threads) {
      Helpers.Trace.sortTraceEventsInPlace(thread.profile.chunks);
      const boundariesOptions = { filter: KNOWN_BOUNDARIES };
      const boundaries = thread.boundaries = collectBoundaries(events2, pid, tid, boundariesOptions);
      const tree = thread.tree = collectStackTraces(thread.profile.chunks);
      const { startTime } = thread.profile.head.args.data;
      const samplesOptions = { filterCodeTypes: true, filterUrls: true };
      const samples = thread.samples = collectSamples(pid, tid, startTime, tree, thread.profile.chunks, samplesOptions);
      const merge = mergeCalls(samples.map((sample) => buildProfileCallFromSample(tree, sample)), boundaries);
      thread.calls = merge.calls;
      thread.dur = merge.dur;
    }
  }
}
export function collectBoundaries(events2, pid, tid, options) {
  const process = events2.get(pid);
  if (!process) {
    return [];
  }
  const thread = process.get(tid);
  if (!thread) {
    return [];
  }
  const boundaries = /* @__PURE__ */ new Set();
  for (const event of thread) {
    const category = KNOWN_EVENTS.get(event.name)?.category ?? EventCategory.Other;
    if (!options.filter.has(category)) {
      continue;
    }
    boundaries.add(event.ts);
    boundaries.add(Types.Timing.MicroSeconds(event.ts + event.dur));
  }
  return [...boundaries].sort((a, b) => a < b ? -1 : 1);
}
export function collectStackTraces(chunks, options) {
  const tree = makeEmptyProfileTree();
  for (const chunk of chunks) {
    const cpuProfile = chunk.args.data.cpuProfile;
    if (!cpuProfile) {
      continue;
    }
    const chain = cpuProfile.nodes;
    if (!chain) {
      continue;
    }
    for (const link of chain) {
      const nodeId = link.id;
      const parentNodeId = link.parent;
      const callFrame = link.callFrame;
      if (!isAllowedCallFrame(callFrame, options)) {
        continue;
      }
      const node = Platform.MapUtilities.getWithDefault(tree.nodes, nodeId, () => makeEmptyProfileNode(callFrame));
      if (parentNodeId === void 0) {
        continue;
      }
      node.parentId = parentNodeId;
      tree.nodes.get(parentNodeId)?.childrenIds.add(nodeId);
    }
  }
  return tree;
}
export function collectSamples(pid, tid, ts, tree, chunks, options) {
  const samples = [];
  for (const chunk of chunks) {
    const { timeDeltas, cpuProfile } = chunk.args.data;
    if (!timeDeltas || !cpuProfile) {
      continue;
    }
    for (let i = 0; i < timeDeltas.length; i++) {
      const timeDelta = timeDeltas[i];
      const nodeId = cpuProfile.samples[i];
      ts = Types.Timing.MicroSeconds(ts + timeDelta);
      const topmostAllowedNodeId = findTopmostAllowedCallFrame(nodeId, tree, options);
      if (topmostAllowedNodeId === null) {
        continue;
      }
      samples.push(makeProfileSample(topmostAllowedNodeId, pid, tid, ts));
    }
  }
  sortProfileSamples(samples);
  return samples;
}
export function mergeCalls(calls, boundaries) {
  const out = { calls: new Array(), dur: Types.Timing.MicroSeconds(0) };
  let boundary = 0;
  for (const call of calls) {
    const isAcrossBoundary = call.ts >= boundary;
    if (isAcrossBoundary) {
      const index = Platform.ArrayUtilities.nearestIndexFromBeginning(boundaries, (ts) => ts > call.ts) ?? Infinity;
      boundary = boundaries[index];
      out.calls.push(call);
      continue;
    }
    const previous = out.calls[out.calls.length - 1];
    const isSameStackFrame = call.stackFrame.nodeId === previous.stackFrame.nodeId;
    const isSampledConsecutively = call.ts - (previous.ts + previous.dur) < SAMPLING_INTERVAL;
    if (!isSameStackFrame || !isSampledConsecutively) {
      out.calls.push(call);
      continue;
    }
    previous.dur = Types.Timing.MicroSeconds(call.ts - previous.ts);
    previous.children.push(...call.children);
  }
  for (const call of out.calls) {
    const merge = mergeCalls(call.children, boundaries);
    call.children = merge.calls;
    call.selfDur = Types.Timing.MicroSeconds(call.dur - merge.dur);
    out.dur = Types.Timing.MicroSeconds(out.dur + call.dur);
  }
  return out;
}
export function isAllowedCallFrame(callFrame, options) {
  if (options?.filterCodeTypes && !ALLOWED_CALL_FRAME_CODE_TYPES.has(callFrame.codeType)) {
    return false;
  }
  if (options?.filterUrls && BANNED_CALL_FRAME_URL_REGS.some((re) => callFrame.url?.match(re))) {
    return false;
  }
  return true;
}
export function findTopmostAllowedCallFrame(nodeId, tree, options) {
  if (nodeId === null) {
    return null;
  }
  const node = tree.nodes.get(nodeId);
  const callFrame = node?.callFrame;
  if (!node || !callFrame) {
    return null;
  }
  if (!isAllowedCallFrame(callFrame, options)) {
    return findTopmostAllowedCallFrame(node.parentId, tree, options);
  }
  return nodeId;
}
export function buildStackTraceAsCallFrameIdsFromId(tree, nodeId) {
  const out = [];
  let currentNodeId = nodeId;
  let currentNode;
  while (currentNodeId !== null && (currentNode = tree.nodes.get(currentNodeId))) {
    out.push(currentNodeId);
    currentNodeId = currentNode.parentId;
  }
  return out.reverse();
}
export function buildStackTraceAsCallFramesFromId(tree, nodeId) {
  const trace = buildStackTraceAsCallFrameIdsFromId(tree, nodeId);
  return trace.map((nodeId2) => {
    const callFrame = tree.nodes.get(nodeId2)?.callFrame;
    if (!callFrame) {
      throw new Error();
    }
    return callFrame;
  });
}
export function buildProfileCallFromSample(tree, sample) {
  const trace = buildStackTraceAsCallFrameIdsFromId(tree, sample.topmostStackFrame.nodeId);
  const calls = trace.map((nodeId) => makeProfileCall(nodeId, sample));
  for (let i = 1; i < calls.length; i++) {
    const parent = calls[i - 1];
    const current = calls[i];
    parent.children.push(current);
  }
  return calls[0];
}
export function getAllFunctionsBetweenTimestamps(calls, begin, end, out = /* @__PURE__ */ new Map()) {
  for (const call of calls) {
    if (call.ts < begin || call.ts + call.dur > end) {
      continue;
    }
    const func = Platform.MapUtilities.getWithDefault(out, call.stackFrame.nodeId, () => makeEmptyProfileFunction(call.stackFrame.nodeId));
    func.calls.push(call);
    func.durPercent += call.dur / (end - begin) * 100;
    func.selfDurPercent += call.selfDur / (end - begin) * 100;
    getAllFunctionsBetweenTimestamps(call.children, begin, end, out);
  }
  return out.values();
}
export function getAllHotFunctionsBetweenTimestamps(calls, begin, end, minSelfPercent) {
  const functions = getAllFunctionsBetweenTimestamps(calls, begin, end);
  const hot = [...functions].filter((info) => info.selfDurPercent >= minSelfPercent);
  return hot.sort((a, b) => a.selfDurPercent > b.selfDurPercent ? -1 : 1);
}
//# sourceMappingURL=SamplesHandler.js.map
