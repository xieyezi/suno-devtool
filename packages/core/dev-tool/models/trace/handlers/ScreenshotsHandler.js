import { data as metaHandlerData } from "./MetaHandler.js";
import * as Helpers from "../helpers/helpers.js";
import * as Types from "../types/types.js";
const eventsInProcessThread = /* @__PURE__ */ new Map();
let snapshots = [];
export function reset() {
  eventsInProcessThread.clear();
  snapshots.length = 0;
}
export function handleEvent(event) {
  if (event.ph !== Types.TraceEvents.TraceEventPhase.OBJECT_SNAPSHOT || event.name !== "Screenshot") {
    return;
  }
  Helpers.Trace.addEventToProcessThread(event, eventsInProcessThread);
}
export async function finalize() {
  const { browserProcessId, browserThreadId } = metaHandlerData();
  const browserThreads = eventsInProcessThread.get(browserProcessId);
  if (browserThreads) {
    snapshots = browserThreads.get(browserThreadId) || [];
  }
}
export function data() {
  return [...snapshots];
}
export function deps() {
  return ["Meta"];
}
//# sourceMappingURL=ScreenshotsHandler.js.map
