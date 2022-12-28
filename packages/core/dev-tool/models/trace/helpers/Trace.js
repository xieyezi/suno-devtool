import * as Common from "../../../core/common/common.js";
import * as Platform from "../../../core/platform/platform.js";
export function extractOriginFromTrace(firstNavigationURL) {
  const url = Common.ParsedURL.ParsedURL.fromString(firstNavigationURL);
  if (url) {
    if (url.host.startsWith("www.")) {
      return url.host.slice(4);
    }
    return url.host;
  }
  return null;
}
export function addEventToProcessThread(event, eventsInProcessThread) {
  const { tid, pid } = event;
  let eventsInThread = eventsInProcessThread.get(pid);
  if (!eventsInThread) {
    eventsInThread = /* @__PURE__ */ new Map();
  }
  let events = eventsInThread.get(tid);
  if (!events) {
    events = [];
  }
  events.push(event);
  eventsInThread.set(event.tid, events);
  eventsInProcessThread.set(event.pid, eventsInThread);
}
export function sortTraceEventsInPlace(events) {
  events.sort((a, b) => {
    const aBeginTime = a.ts;
    const bBeginTime = b.ts;
    if (aBeginTime < bBeginTime) {
      return -1;
    }
    if (aBeginTime > bBeginTime) {
      return 1;
    }
    const aDuration = a.dur ?? 0;
    const bDuration = b.dur ?? 0;
    const aEndTime = aBeginTime + aDuration;
    const bEndTime = bBeginTime + bDuration;
    if (aEndTime > bEndTime) {
      return -1;
    }
    if (aEndTime < bEndTime) {
      return 1;
    }
    return 0;
  });
}
export function getNavigationForTraceEvent(event, eventFrameId, navigationsByFrameId) {
  const navigations = navigationsByFrameId.get(eventFrameId);
  if (!navigations || eventFrameId === "") {
    return null;
  }
  const eventNavigationIndex = Platform.ArrayUtilities.nearestIndexFromEnd(navigations, (navigation) => navigation.ts <= event.ts);
  if (eventNavigationIndex === null) {
    return null;
  }
  return navigations[eventNavigationIndex];
}
//# sourceMappingURL=Trace.js.map
