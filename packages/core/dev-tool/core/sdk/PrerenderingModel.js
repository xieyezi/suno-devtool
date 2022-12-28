import * as Protocol from "../../generated/protocol.js";
import * as ChildTargetManager from "./ChildTargetManager.js";
import * as ResourceTreeModel from "./ResourceTreeModel.js";
import * as SDKModel from "./SDKModel.js";
import * as Target from "./Target.js";
import * as TargetManager from "./TargetManager.js";
export class PrerenderingModel extends SDKModel.SDKModel {
  registry = new PrerenderingRegistry();
  constructor(target) {
    super(target);
    TargetManager.TargetManager.instance().addModelListener(ChildTargetManager.ChildTargetManager, ChildTargetManager.Events.TargetInfoChanged, this.onTargetInfoChanged, this);
    TargetManager.TargetManager.instance().observeModels(ResourceTreeModel.ResourceTreeModel, this);
  }
  dispose() {
    super.dispose();
    TargetManager.TargetManager.instance().removeModelListener(ChildTargetManager.ChildTargetManager, ChildTargetManager.Events.TargetInfoChanged, this.onTargetInfoChanged, this);
    TargetManager.TargetManager.instance().unobserveModels(ResourceTreeModel.ResourceTreeModel, this);
  }
  getById(id) {
    return this.registry.getById(id);
  }
  getAll() {
    return this.registry.getAll();
  }
  clearNotOngoing() {
    this.registry.clearNotOngoing();
    this.dispatchPrerenderingAttemptsRemoved();
  }
  dispatchPrerenderingAttemptStarted() {
    this.dispatchEventToListeners(Events.PrerenderingAttemptStarted);
  }
  dispatchPrerenderingAttemptUpdated() {
    this.dispatchEventToListeners(Events.PrerenderingAttemptUpdated);
  }
  dispatchPrerenderingAttemptsRemoved() {
    this.dispatchEventToListeners(Events.PrerenderingAttemptsRemoved);
  }
  onTargetInfoChanged(event) {
    const targetInfo = event.data;
    if (targetInfo.subtype !== "prerender") {
      return;
    }
    if (targetInfo.url === "") {
      return;
    }
    const frameId = targetInfo.targetId;
    this.registry.maybeAddOpaquePrerendering(frameId, targetInfo.url);
    this.dispatchPrerenderingAttemptStarted();
  }
  modelAdded(model) {
    model.addEventListener(ResourceTreeModel.Events.PrerenderAttemptCompleted, this.onPrerenderAttemptCompleted, this);
  }
  modelRemoved(model) {
    model.removeEventListener(ResourceTreeModel.Events.PrerenderAttemptCompleted, this.onPrerenderAttemptCompleted, this);
  }
  onPrerenderAttemptCompleted(event) {
    const inner = event.data;
    this.registry.updateOpaquePrerenderingAttempt(inner);
    this.dispatchPrerenderingAttemptUpdated();
  }
}
SDKModel.SDKModel.register(PrerenderingModel, { capabilities: Target.Capability.Target, autostart: false });
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["PrerenderingAttemptStarted"] = "PrerenderingAttemptStarted";
  Events2["PrerenderingAttemptUpdated"] = "PrerenderingAttemptUpdated";
  Events2["PrerenderingAttemptsRemoved"] = "PrerenderingAttemtsRemoved";
  return Events2;
})(Events || {});
export var PrerenderingStatus = /* @__PURE__ */ ((PrerenderingStatus2) => {
  PrerenderingStatus2["Prerendering"] = "Prerendering";
  PrerenderingStatus2["Activated"] = "Activated";
  PrerenderingStatus2["Discarded"] = "Discarded";
  return PrerenderingStatus2;
})(PrerenderingStatus || {});
export class PrerenderingRegistry {
  entities = /* @__PURE__ */ new Map();
  opaqueUrlToPreId = /* @__PURE__ */ new Map();
  getById(id) {
    return this.entities.get(id) || null;
  }
  getAll() {
    return Array.from(this.entities.entries()).map(([id, attempt]) => ({ id, attempt }));
  }
  makePreloadingId(x) {
    if (x.trigger.kind === "PrerenderingTriggerOpaque") {
      return `PrerenderingAttempt-opaque:${x.prerenderingAttemptId}`;
    }
    return `PrerenderingAttempt:${x.prerenderingAttemptId}`;
  }
  makePreIdOfPrerendering(frameId) {
    return `PrerenderingAttempt-opaque:${frameId}`;
  }
  processEvent(event) {
    switch (event.kind) {
      case "PrerenderingAttemptEventAdd": {
        this.entities.set(this.makePreloadingId(event.attempt), event.attempt);
        break;
      }
      case "PrerenderingAttemptEventUpdate": {
        this.entities.set(this.makePreloadingId(event.update), event.update);
        const x = event.update;
        if (x.status !== "Prerendering" /* Prerendering */) {
          if (this.opaqueUrlToPreId.get(x.url)) {
            this.opaqueUrlToPreId.delete(x.url);
          }
        }
        break;
      }
    }
  }
  clearNotOngoing() {
    for (const [id, x] of this.entities.entries()) {
      if (x.status !== "Prerendering" /* Prerendering */) {
        this.entities.delete(id);
      }
    }
  }
  maybeAddOpaquePrerendering(frameId, url) {
    if (this.entities.get(this.makePreIdOfPrerendering(frameId)) !== void 0) {
      return;
    }
    const prerenderingAttemptId = frameId;
    const event = {
      kind: "PrerenderingAttemptEventAdd",
      attempt: {
        prerenderingAttemptId,
        startedAt: Date.now(),
        trigger: {
          kind: "PrerenderingTriggerOpaque"
        },
        url,
        status: "Prerendering" /* Prerendering */
      }
    };
    this.processEvent(event);
    const id = this.makePreIdOfPrerendering(frameId);
    this.opaqueUrlToPreId.set(url, id);
  }
  updateOpaquePrerenderingAttempt(event) {
    const id = this.opaqueUrlToPreId.get(event.prerenderingUrl);
    if (id === void 0) {
      return;
    }
    const originalAttempt = this.entities.get(id);
    if (originalAttempt === void 0) {
      return;
    }
    const status = event.finalStatus === Protocol.Page.PrerenderFinalStatus.Activated ? "Activated" /* Activated */ : "Discarded" /* Discarded */;
    const eventInternal = {
      kind: "PrerenderingAttemptEventUpdate",
      update: {
        prerenderingAttemptId: originalAttempt.prerenderingAttemptId,
        startedAt: originalAttempt.startedAt,
        trigger: originalAttempt.trigger,
        url: originalAttempt.url,
        status,
        discardedReason: this.getDiscardedReason(event)
      }
    };
    this.processEvent(eventInternal);
  }
  getDiscardedReason(event) {
    switch (event.finalStatus) {
      case Protocol.Page.PrerenderFinalStatus.Activated:
        return null;
      case Protocol.Page.PrerenderFinalStatus.Destroyed:
        return null;
      default:
        return event.finalStatus;
    }
  }
}
//# sourceMappingURL=PrerenderingModel.js.map
