import * as SDK from "../../../core/sdk/sdk.js";
const singleNodeCache = /* @__PURE__ */ new Map();
const batchNodesCache = /* @__PURE__ */ new Map();
export function _TEST_clearCache() {
  singleNodeCache.clear();
  batchNodesCache.clear();
}
export async function forNodeId(modelData, nodeId) {
  const fromCache = singleNodeCache.get(modelData)?.get(nodeId);
  if (fromCache !== void 0) {
    return fromCache;
  }
  const target = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return null;
  }
  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([nodeId]));
  const result = domNodesMap?.get(nodeId) || null;
  const cacheForModel = singleNodeCache.get(modelData) || /* @__PURE__ */ new Map();
  cacheForModel.set(nodeId, result);
  singleNodeCache.set(modelData, cacheForModel);
  return result;
}
export async function forMultipleNodeIds(modelData, nodeIds) {
  const fromCache = batchNodesCache.get(modelData)?.get(nodeIds);
  if (fromCache) {
    return fromCache;
  }
  const target = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return /* @__PURE__ */ new Map();
  }
  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(nodeIds) || /* @__PURE__ */ new Map();
  const cacheForModel = batchNodesCache.get(modelData) || /* @__PURE__ */ new Map();
  cacheForModel.set(nodeIds, domNodesMap);
  batchNodesCache.set(modelData, cacheForModel);
  return domNodesMap;
}
//# sourceMappingURL=DOMNodeLookup.js.map
