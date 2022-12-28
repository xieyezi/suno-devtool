import * as Types from "../types/types.js";
const textPaintByDOMNodeId = /* @__PURE__ */ new Map();
export function reset() {
  textPaintByDOMNodeId.clear();
}
export function handleEvent(event) {
  if (!Types.TraceEvents.isTraceEventLargestTextPaintCandidate(event)) {
    return;
  }
  if (!event.args.data) {
    return;
  }
  textPaintByDOMNodeId.set(event.args.data.DOMNodeId, event);
}
export function data() {
  return new Map(textPaintByDOMNodeId);
}
//# sourceMappingURL=LargestTextPaintHandler.js.map
