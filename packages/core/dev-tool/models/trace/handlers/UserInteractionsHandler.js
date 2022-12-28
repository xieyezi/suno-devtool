import * as Helpers from "../helpers/helpers.js";
import * as Types from "../types/types.js";
import { HandlerState } from "./types.js";
const allEvents = [];
const interactionEvents = [];
let handlerState = HandlerState.UNINITIALIZED;
export function reset() {
  allEvents.length = 0;
  interactionEvents.length = 0;
  handlerState = HandlerState.INITIALIZED;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Handler is not initialized");
  }
  if (!Types.TraceEvents.isTraceEventEventTiming(event)) {
    return;
  }
  allEvents.push(event);
  if (!event.args.data) {
    return;
  }
  const { duration, interactionId } = event.args.data;
  if (duration < 1 || interactionId === void 0 || interactionId === 0) {
    return;
  }
  const interactionEvent = {
    ...event,
    interactionId,
    dur: Helpers.Timing.millisecondsToMicroseconds(duration)
  };
  interactionEvents.push(interactionEvent);
}
export async function finalize() {
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  return {
    allEvents: [...allEvents],
    interactionEvents: [...interactionEvents]
  };
}
//# sourceMappingURL=UserInteractionsHandler.js.map
