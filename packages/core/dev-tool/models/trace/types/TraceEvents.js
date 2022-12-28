export var TraceEventPhase = /* @__PURE__ */ ((TraceEventPhase2) => {
  TraceEventPhase2["BEGIN"] = "B";
  TraceEventPhase2["END"] = "E";
  TraceEventPhase2["COMPLETE"] = "X";
  TraceEventPhase2["INSTANT"] = "I";
  TraceEventPhase2["COUNTER"] = "C";
  TraceEventPhase2["ASYNC_NESTABLE_START"] = "b";
  TraceEventPhase2["ASYNC_NESTABLE_INSTANT"] = "n";
  TraceEventPhase2["ASYNC_NESTABLE_END"] = "e";
  TraceEventPhase2["FLOW_START"] = "s";
  TraceEventPhase2["FLOW_STEP"] = "t";
  TraceEventPhase2["FLOW_END"] = "f";
  TraceEventPhase2["SAMPLE"] = "P";
  TraceEventPhase2["OBJECT_CREATED"] = "N";
  TraceEventPhase2["OBJECT_SNAPSHOT"] = "O";
  TraceEventPhase2["OBJECT_DESTROYED"] = "D";
  TraceEventPhase2["METADATA"] = "M";
  TraceEventPhase2["MEMORY_DUMP_GLOBAL"] = "V";
  TraceEventPhase2["MEMORY_DUMP_PROCESS"] = "v";
  TraceEventPhase2["MARK"] = "R";
  TraceEventPhase2["CLOCK_SYNC"] = "c";
  return TraceEventPhase2;
})(TraceEventPhase || {});
export var TraceEventScope = /* @__PURE__ */ ((TraceEventScope2) => {
  TraceEventScope2["THREAD"] = "t";
  TraceEventScope2["PROCESS"] = "p";
  TraceEventScope2["GLOBAL"] = "g";
  return TraceEventScope2;
})(TraceEventScope || {});
export var LayoutInvalidationReason = /* @__PURE__ */ ((LayoutInvalidationReason2) => {
  LayoutInvalidationReason2["SIZE_CHANGED"] = "Size changed";
  LayoutInvalidationReason2["ATTRIBUTE"] = "Attribute";
  LayoutInvalidationReason2["ADDED_TO_LAYOUT"] = "Added to layout";
  LayoutInvalidationReason2["SCROLLBAR_CHANGED"] = "Scrollbar changed";
  LayoutInvalidationReason2["REMOVED_FROM_LAYOUT"] = "Removed from layout";
  LayoutInvalidationReason2["STYLE_CHANGED"] = "Style changed";
  LayoutInvalidationReason2["FONTS_CHANGED"] = "Fonts changed";
  LayoutInvalidationReason2["UNKNOWN"] = "Unknown";
  return LayoutInvalidationReason2;
})(LayoutInvalidationReason || {});
export var StyleRecalcInvalidationReason = /* @__PURE__ */ ((StyleRecalcInvalidationReason2) => {
  StyleRecalcInvalidationReason2["ANIMATION"] = "Animation";
  return StyleRecalcInvalidationReason2;
})(StyleRecalcInvalidationReason || {});
class ProfileIdTag {
  #profileIdTag;
}
export function ProfileID(value) {
  return value;
}
class CallFrameIdTag {
  #callFrameIdTag;
}
export function CallFrameID(value) {
  return value;
}
class ProcessIdTag {
  #processIdTag;
}
export function ProcessID(value) {
  return value;
}
class ThreadIdTag {
  #threadIdTag;
}
export function ThreadID(value) {
  return value;
}
export function isTraceEventComplete(event) {
  return event.ph === "X" /* COMPLETE */;
}
export function isTraceEventDispatch(event) {
  return event.name === "EventDispatch";
}
export function isTraceEventInstant(event) {
  return event.ph === "I" /* INSTANT */;
}
export function isTraceEventRendererEvent(event) {
  return isTraceEventInstant(event) || isTraceEventComplete(event);
}
export function isThreadName(traceEventData) {
  return traceEventData.name === "thread_name";
}
export function isProcessName(traceEventData) {
  return traceEventData.name === "process_name";
}
export function isTraceEventTracingStartedInBrowser(traceEventData) {
  return traceEventData.name === "TracingStartedInBrowser";
}
export function isTraceEventFrameCommittedInBrowser(traceEventData) {
  return traceEventData.name === "FrameCommittedInBrowser";
}
export function isTraceEventCommitLoad(traceEventData) {
  return traceEventData.name === "CommitLoad";
}
export function isTraceEventNavigationStart(traceEventData) {
  return traceEventData.name === "navigationStart";
}
export function isTraceEventAnimation(traceEventData) {
  return traceEventData.name === "Animation";
}
export function isTraceEventLayoutShift(traceEventData) {
  return traceEventData.name === "LayoutShift";
}
export function isTraceEventLayoutInvalidation(traceEventData) {
  return traceEventData.name === "LayoutInvalidationTracking" || traceEventData.name === "ScheduleStyleInvalidationTracking";
}
export function isTraceEventStyleRecalcInvalidation(traceEventData) {
  return traceEventData.name === "StyleRecalcInvalidationTracking";
}
export function isTraceEventFirstContentfulPaint(traceEventData) {
  return traceEventData.name === "firstContentfulPaint";
}
export function isTraceEventLargestContentfulPaintCandidate(traceEventData) {
  return traceEventData.name === "largestContentfulPaint::Candidate";
}
export function isTraceEventLargestImagePaintCandidate(traceEventData) {
  return traceEventData.name === "LargestImagePaint::Candidate";
}
export function isTraceEventLargestTextPaintCandidate(traceEventData) {
  return traceEventData.name === "LargestTextPaint::Candidate";
}
export function isTraceEventMarkDOMContent(traceEventData) {
  return traceEventData.name === "MarkDOMContent";
}
export function isTraceEventInteractiveTime(traceEventData) {
  return traceEventData.name === "InteractiveTime";
}
export function isTraceEventEventTiming(traceEventData) {
  return traceEventData.name === "EventTiming";
}
export function isTraceEventGPUTask(traceEventData) {
  return traceEventData.name === "GPUTask";
}
export function isTraceEventProfile(traceEventData) {
  return traceEventData.name === "Profile";
}
export function isTraceEventProfileChunk(traceEventData) {
  return traceEventData.name === "ProfileChunk";
}
export function isTraceEventResourceSendRequest(traceEventData) {
  return traceEventData.name === "ResourceSendRequest";
}
export function isTraceEventResourceReceiveResponse(traceEventData) {
  return traceEventData.name === "ResourceReceiveResponse";
}
export function isTraceEventResourceFinish(traceEventData) {
  return traceEventData.name === "ResourceFinish";
}
export function isTraceEventResourceWillSendRequest(traceEventData) {
  return traceEventData.name === "ResourceWillSendRequest";
}
export function isTraceEventResourceReceivedData(traceEventData) {
  return traceEventData.name === "ResourceReceivedData";
}
export function isSyntheticNetworkRequestDetailsEvent(traceEventData) {
  return traceEventData.name === "SyntheticNetworkRequest";
}
export function isTraceEventPrePaint(traceEventData) {
  return traceEventData.name === "PrePaint";
}
export function isTraceEventNavigationStartWithURL(event) {
  return Boolean(isTraceEventNavigationStart(event) && event.args.data && event.args.data.documentLoaderURL !== "");
}
export function isTraceEventMainFrameViewport(traceEventData) {
  return traceEventData.name === "PaintTimingVisualizer::Viewport";
}
export function isSyntheticUserTimingTraceEvent(traceEventData) {
  if (traceEventData.cat !== "blink.user_timing") {
    return false;
  }
  const data = traceEventData.args?.data;
  if (!data) {
    return false;
  }
  return "beginEvent" in data && "endEvent" in data;
}
export function isTraceEventUserTimingsBeginOrEnd(traceEventData) {
  const validPhases = /* @__PURE__ */ new Set(["b" /* ASYNC_NESTABLE_START */, "e" /* ASYNC_NESTABLE_END */]);
  return validPhases.has(traceEventData.ph) && traceEventData.cat === "blink.user_timing";
}
//# sourceMappingURL=TraceEvents.js.map
