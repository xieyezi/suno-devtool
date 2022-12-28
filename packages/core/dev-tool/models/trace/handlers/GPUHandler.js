import { data as metaHandlerData } from "./MetaHandler.js";
import { HandlerState } from "./types.js";
import * as Types from "../types/types.js";
import * as Helpers from "../helpers/helpers.js";
let handlerState = HandlerState.UNINITIALIZED;
const eventsInProcessThread = /* @__PURE__ */ new Map();
let mainGPUThreadTasks = [];
export function reset() {
  eventsInProcessThread.clear();
  mainGPUThreadTasks = [];
  handlerState = HandlerState.UNINITIALIZED;
}
export function initialize() {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error("GPU Handler was not reset before being initialized");
  }
  handlerState = HandlerState.INITIALIZED;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("GPU Handler is not initialized");
  }
  if (!Types.TraceEvents.isTraceEventGPUTask(event)) {
    return;
  }
  Helpers.Trace.addEventToProcessThread(event, eventsInProcessThread);
}
export async function finalize() {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("GPU Handler is not initialized");
  }
  const { gpuProcessId, gpuThreadId } = metaHandlerData();
  const gpuThreadsForProcess = eventsInProcessThread.get(gpuProcessId);
  if (gpuThreadsForProcess && gpuThreadId) {
    mainGPUThreadTasks = gpuThreadsForProcess.get(gpuThreadId) || [];
  }
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("GPU Handler is not finalized");
  }
  return {
    mainGPUThreadTasks: [...mainGPUThreadTasks]
  };
}
export function deps() {
  return ["Meta"];
}
//# sourceMappingURL=GPUHandler.js.map
