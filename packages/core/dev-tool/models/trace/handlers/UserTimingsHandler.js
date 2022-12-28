import * as Platform from "../../../core/platform/platform.js";
import * as Types from "../types/types.js";
import { HandlerState } from "./types.js";
const syntheticEvents = [];
const timingEvents = [];
let handlerState = HandlerState.UNINITIALIZED;
export function reset() {
  syntheticEvents.length = 0;
  timingEvents.length = 0;
  handlerState = HandlerState.INITIALIZED;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("UserTimings handler is not initialized");
  }
  if (Types.TraceEvents.isTraceEventUserTimingsBeginOrEnd(event)) {
    timingEvents.push(event);
  }
}
export async function finalize() {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("UserTimings handler is not initialized");
  }
  const matchedEvents = /* @__PURE__ */ new Map();
  for (const event of timingEvents) {
    const otherEventsWithID = Platform.MapUtilities.getWithDefault(matchedEvents, event.id, () => {
      return { begin: null, end: null };
    });
    const isStartEvent = event.ph === Types.TraceEvents.TraceEventPhase.ASYNC_NESTABLE_START;
    const isEndEvent = event.ph === Types.TraceEvents.TraceEventPhase.ASYNC_NESTABLE_END;
    if (isStartEvent) {
      otherEventsWithID.begin = event;
    } else if (isEndEvent) {
      otherEventsWithID.end = event;
    }
  }
  for (const [id, eventsPair] of matchedEvents.entries()) {
    if (!eventsPair.begin || !eventsPair.end) {
      continue;
    }
    const event = {
      cat: eventsPair.end.cat,
      ph: eventsPair.end.ph,
      pid: eventsPair.end.pid,
      tid: eventsPair.end.tid,
      id,
      name: eventsPair.begin.name,
      dur: Types.Timing.MicroSeconds(eventsPair.end.ts - eventsPair.begin.ts),
      ts: eventsPair.begin.ts,
      args: {
        data: {
          beginEvent: eventsPair.begin,
          endEvent: eventsPair.end
        }
      }
    };
    syntheticEvents.push(event);
  }
  syntheticEvents.sort((event1, event2) => {
    if (event1.ts > event2.ts) {
      return 1;
    }
    if (event2.ts > event1.ts) {
      return -1;
    }
    return 0;
  });
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("UserTimings handler is not finalized");
  }
  return {
    timings: [...syntheticEvents]
  };
}
//# sourceMappingURL=UserTimingsHandler.js.map
