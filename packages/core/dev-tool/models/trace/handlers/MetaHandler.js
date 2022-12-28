import * as Platform from "../../../core/platform/platform.js";
import * as Types from "../types/types.js";
import { HandlerState } from "./types.js";
const rendererProcessesByFrameId = /* @__PURE__ */ new Map();
let mainFrameId = "";
let mainFrameURL = "";
let browserProcessId = Types.TraceEvents.ProcessID(-1);
let browserThreadId = Types.TraceEvents.ThreadID(-1);
let gpuProcessId = Types.TraceEvents.ProcessID(-1);
let gpuThreadId = Types.TraceEvents.ThreadID(-1);
let viewportRect = null;
const topLevelRendererIds = /* @__PURE__ */ new Set();
const traceBounds = {
  min: Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY),
  max: Types.Timing.MicroSeconds(Number.NEGATIVE_INFINITY),
  range: Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY)
};
const navigationsByFrameId = /* @__PURE__ */ new Map();
const navigationsByNavigationId = /* @__PURE__ */ new Map();
const threadsInProcess = /* @__PURE__ */ new Map();
let traceStartedTime = Types.Timing.MicroSeconds(-1);
const eventPhasesOfInterestForTraceBounds = /* @__PURE__ */ new Set([
  Types.TraceEvents.TraceEventPhase.BEGIN,
  Types.TraceEvents.TraceEventPhase.END,
  Types.TraceEvents.TraceEventPhase.COMPLETE,
  Types.TraceEvents.TraceEventPhase.INSTANT
]);
let handlerState = HandlerState.UNINITIALIZED;
export function reset() {
  navigationsByFrameId.clear();
  navigationsByNavigationId.clear();
  browserProcessId = Types.TraceEvents.ProcessID(-1);
  browserThreadId = Types.TraceEvents.ThreadID(-1);
  gpuProcessId = Types.TraceEvents.ProcessID(-1);
  gpuThreadId = Types.TraceEvents.ThreadID(-1);
  viewportRect = null;
  topLevelRendererIds.clear();
  threadsInProcess.clear();
  rendererProcessesByFrameId.clear();
  traceBounds.min = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceBounds.max = Types.Timing.MicroSeconds(Number.NEGATIVE_INFINITY);
  traceBounds.range = Types.Timing.MicroSeconds(Number.POSITIVE_INFINITY);
  traceStartedTime = Types.Timing.MicroSeconds(-1);
  handlerState = HandlerState.UNINITIALIZED;
}
export function initialize() {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error("Meta Handler was not reset");
  }
  handlerState = HandlerState.INITIALIZED;
}
function updateRendererProcessByFrame(event, frame) {
  const rendererProcessInFrame = Platform.MapUtilities.getWithDefault(rendererProcessesByFrameId, frame.frame, () => /* @__PURE__ */ new Map());
  const rendererProcessInfo = Platform.MapUtilities.getWithDefault(rendererProcessInFrame, frame.processId, () => {
    return {
      frame,
      window: {
        min: Types.Timing.MicroSeconds(0),
        max: Types.Timing.MicroSeconds(0),
        range: Types.Timing.MicroSeconds(0)
      }
    };
  });
  if (rendererProcessInfo.window.min !== Types.Timing.MicroSeconds(0)) {
    return;
  }
  rendererProcessInfo.window.min = event.ts;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Meta Handler is not initialized");
  }
  if (event.ts !== 0 && !event.name.endsWith("::UMA") && eventPhasesOfInterestForTraceBounds.has(event.ph)) {
    traceBounds.min = Types.Timing.MicroSeconds(Math.min(event.ts, traceBounds.min));
    const eventDuration = event.dur || Types.Timing.MicroSeconds(0);
    traceBounds.max = Types.Timing.MicroSeconds(Math.max(event.ts + eventDuration, traceBounds.max));
  }
  if (Types.TraceEvents.isProcessName(event) && (event.args.name === "Browser" || event.args.name === "HeadlessBrowser")) {
    browserProcessId = event.pid;
    return;
  }
  if (Types.TraceEvents.isProcessName(event) && (event.args.name === "Gpu" || event.args.name === "GPU Process")) {
    gpuProcessId = event.pid;
    return;
  }
  if (Types.TraceEvents.isThreadName(event) && event.args.name === "CrGpuMain") {
    gpuThreadId = event.tid;
    return;
  }
  if (Types.TraceEvents.isThreadName(event) && event.args.name === "CrBrowserMain") {
    browserThreadId = event.tid;
  }
  if (Types.TraceEvents.isTraceEventMainFrameViewport(event) && viewportRect === null) {
    const rectAsArray = event.args.data.viewport_rect;
    const viewportX = rectAsArray[0];
    const viewportY = rectAsArray[1];
    const viewportWidth = rectAsArray[2];
    const viewportHeight = rectAsArray[5];
    viewportRect = new DOMRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }
  if (Types.TraceEvents.isTraceEventTracingStartedInBrowser(event)) {
    traceStartedTime = event.ts;
    if (!event.args.data) {
      throw new Error("No frames found in trace data");
    }
    for (const frame of event.args.data.frames) {
      updateRendererProcessByFrame(event, frame);
      if (frame.parent) {
        continue;
      }
      mainFrameId = frame.frame;
      mainFrameURL = frame.url;
      topLevelRendererIds.add(frame.processId);
    }
    return;
  }
  if (Types.TraceEvents.isTraceEventFrameCommittedInBrowser(event)) {
    const frame = event.args.data;
    if (!frame) {
      return;
    }
    updateRendererProcessByFrame(event, frame);
    if (frame.parent) {
      return;
    }
    topLevelRendererIds.add(frame.processId);
    return;
  }
  if (Types.TraceEvents.isTraceEventCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }
    const { frame, name, url } = frameData;
    updateRendererProcessByFrame(event, { processId: event.pid, frame, name, url });
    return;
  }
  if (Types.TraceEvents.isThreadName(event)) {
    const threads = Platform.MapUtilities.getWithDefault(threadsInProcess, event.pid, () => /* @__PURE__ */ new Map());
    threads.set(event.tid, event);
    return;
  }
  if (Types.TraceEvents.isTraceEventNavigationStartWithURL(event) && event.args.data) {
    const navigationId = event.args.data.navigationId;
    if (navigationsByNavigationId.has(navigationId)) {
      throw new Error("Found multiple navigation start events with the same navigation ID.");
    }
    navigationsByNavigationId.set(navigationId, event);
    const frameId = event.args.frame;
    const existingFrameNavigations = navigationsByFrameId.get(frameId) || [];
    existingFrameNavigations.push(event);
    navigationsByFrameId.set(frameId, existingFrameNavigations);
    return;
  }
}
export async function finalize() {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Handler is not initialized");
  }
  if (traceStartedTime === -1) {
    throw new Error("Error parsing trace data: no TracingStartedInBrowser event found.");
  }
  traceBounds.min = traceStartedTime;
  traceBounds.range = Types.Timing.MicroSeconds(traceBounds.max - traceBounds.min);
  if (topLevelRendererIds.size === 0) {
    throw new Error("Unable to find renderer processes");
  }
  if (browserProcessId === Types.TraceEvents.ProcessID(-1)) {
    throw new Error("Unable to find browser process");
  }
  if (browserThreadId === Types.TraceEvents.ThreadID(-1)) {
    throw new Error("Unable to find browser thread");
  }
  if (gpuProcessId === Types.TraceEvents.ProcessID(-1)) {
    throw new Error("Unable to find GPU process");
  }
  if (!mainFrameId) {
    throw new Error("Unable to find main frame ID");
  }
  for (const [, processWindows] of rendererProcessesByFrameId) {
    const processWindowValues = [...processWindows.values()];
    for (let i = 0; i < processWindowValues.length; i++) {
      const currentWindow = processWindowValues[i];
      const nextWindow = processWindowValues[i + 1];
      if (!nextWindow) {
        currentWindow.window.max = Types.Timing.MicroSeconds(traceBounds.max);
        currentWindow.window.range = Types.Timing.MicroSeconds(traceBounds.max - currentWindow.window.min);
      } else {
        currentWindow.window.max = Types.Timing.MicroSeconds(nextWindow.window.min - 1);
        currentWindow.window.range = Types.Timing.MicroSeconds(currentWindow.window.max - currentWindow.window.min);
      }
    }
  }
  for (const [frameId, navigations] of navigationsByFrameId) {
    if (rendererProcessesByFrameId.has(frameId)) {
      continue;
    }
    navigationsByFrameId.delete(frameId);
    for (const navigation of navigations) {
      if (!navigation.args.data) {
        continue;
      }
      navigationsByNavigationId.delete(navigation.args.data.navigationId);
    }
  }
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("Meta Handler is not finalized");
  }
  return {
    traceBounds: { ...traceBounds },
    browserProcessId,
    browserThreadId,
    gpuProcessId,
    gpuThreadId: gpuThreadId === Types.TraceEvents.ThreadID(-1) ? void 0 : gpuThreadId,
    viewportRect: viewportRect || void 0,
    mainFrameId,
    mainFrameURL,
    navigationsByFrameId: new Map(navigationsByFrameId),
    navigationsByNavigationId: new Map(navigationsByNavigationId),
    threadsInProcess: new Map(threadsInProcess),
    rendererProcessesByFrame: new Map(rendererProcessesByFrameId),
    topLevelRendererIds: new Set(topLevelRendererIds)
  };
}
//# sourceMappingURL=MetaHandler.js.map
