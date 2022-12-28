import * as SDK from "../../../core/sdk/sdk.js";
import { forNodeId } from "./DOMNodeLookup.js";
const layoutShiftSourcesCache = /* @__PURE__ */ new Map();
const normalizedNodesCache = /* @__PURE__ */ new Map();
export function _TEST_clearCache() {
  layoutShiftSourcesCache.clear();
  normalizedNodesCache.clear();
}
export async function sourcesForLayoutShift(modelData, event) {
  const fromCache = layoutShiftSourcesCache.get(modelData)?.get(event);
  if (fromCache) {
    return fromCache;
  }
  const impactedNodes = event.args.data?.impacted_nodes;
  if (!impactedNodes) {
    return [];
  }
  const sources = [];
  await Promise.all(impactedNodes.map(async (node) => {
    const domNode = await forNodeId(modelData, node.node_id);
    if (domNode) {
      sources.push({
        previousRect: new DOMRect(node.old_rect[0], node.old_rect[1], node.old_rect[2], node.old_rect[3]),
        currentRect: new DOMRect(node.new_rect[0], node.new_rect[1], node.new_rect[2], node.new_rect[3]),
        node: domNode
      });
    }
  }));
  const cacheForModel = layoutShiftSourcesCache.get(modelData) || /* @__PURE__ */ new Map();
  cacheForModel.set(event, sources);
  layoutShiftSourcesCache.set(modelData, cacheForModel);
  return sources;
}
export async function normalizedImpactedNodesForLayoutShift(modelData, event) {
  const fromCache = normalizedNodesCache.get(modelData)?.get(event);
  if (fromCache) {
    return fromCache;
  }
  const impactedNodes = event.args?.data?.impacted_nodes;
  if (!impactedNodes) {
    return [];
  }
  let viewportScale = null;
  const target = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
  const evaluateResult = await target?.runtimeAgent().invoke_evaluate({ expression: "window.devicePixelRatio" });
  if (evaluateResult?.result.type === "number") {
    viewportScale = evaluateResult?.result.value ?? null;
  }
  if (!viewportScale) {
    return impactedNodes;
  }
  const normalizedNodes = [];
  for (const impactedNode of impactedNodes) {
    const newNode = { ...impactedNode };
    for (let i = 0; i < impactedNode.old_rect.length; i++) {
      newNode.old_rect[i] /= viewportScale;
    }
    for (let i = 0; i < impactedNode.new_rect.length; i++) {
      newNode.new_rect[i] /= viewportScale;
    }
    normalizedNodes.push(newNode);
  }
  const cacheForModel = normalizedNodesCache.get(modelData) || /* @__PURE__ */ new Map();
  cacheForModel.set(event, normalizedNodes);
  normalizedNodesCache.set(modelData, cacheForModel);
  return normalizedNodes;
}
//# sourceMappingURL=LayoutShifts.js.map
