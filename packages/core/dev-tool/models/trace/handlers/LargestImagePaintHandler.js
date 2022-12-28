import * as Types from "../types/types.js";
const imageByDOMNodeId = /* @__PURE__ */ new Map();
export function reset() {
  imageByDOMNodeId.clear();
}
export function handleEvent(event) {
  if (!Types.TraceEvents.isTraceEventLargestImagePaintCandidate(event)) {
    return;
  }
  if (!event.args.data) {
    return;
  }
  imageByDOMNodeId.set(event.args.data.DOMNodeId, event);
}
export function data() {
  return new Map(imageByDOMNodeId);
}
//# sourceMappingURL=LargestImagePaintHandler.js.map
