import * as Common from "../common/common.js";
import * as i18n from "../i18n/i18n.js";
import { Capability } from "./Target.js";
import { SDKModel } from "./SDKModel.js";
import { Events as SecurityOriginManagerEvents, SecurityOriginManager } from "./SecurityOriginManager.js";
import { Events as StorageKeyManagerEvents, StorageKeyManager } from "./StorageKeyManager.js";
const UIStrings = {
  serviceworkercacheagentError: "`ServiceWorkerCacheAgent` error deleting cache entry {PH1} in cache: {PH2}"
};
const str_ = i18n.i18n.registerUIStrings("core/sdk/ServiceWorkerCacheModel.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class ServiceWorkerCacheModel extends SDKModel {
  cacheAgent;
  #storageAgent;
  #securityOriginManager;
  #storageKeyManager;
  #cachesInternal = /* @__PURE__ */ new Map();
  #originsUpdated = /* @__PURE__ */ new Set();
  #storageKeysUpdated = /* @__PURE__ */ new Set();
  #throttler = new Common.Throttler.Throttler(2e3);
  #enabled = false;
  #scheduleAsSoonAsPossible = false;
  constructor(target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.cacheAgent = target.cacheStorageAgent();
    this.#storageAgent = target.storageAgent();
    this.#securityOriginManager = target.model(SecurityOriginManager);
    this.#storageKeyManager = target.model(StorageKeyManager);
  }
  enable() {
    if (this.#enabled) {
      return;
    }
    this.#securityOriginManager.addEventListener(SecurityOriginManagerEvents.SecurityOriginAdded, this.securityOriginAdded, this);
    this.#securityOriginManager.addEventListener(SecurityOriginManagerEvents.SecurityOriginRemoved, this.securityOriginRemoved, this);
    this.#storageKeyManager.addEventListener(StorageKeyManagerEvents.StorageKeyAdded, this.storageKeyAdded, this);
    this.#storageKeyManager.addEventListener(StorageKeyManagerEvents.StorageKeyRemoved, this.storageKeyRemoved, this);
    for (const securityOrigin of this.#securityOriginManager.securityOrigins()) {
      this.addOrigin(securityOrigin);
    }
    for (const storageKey of this.#storageKeyManager.storageKeys()) {
      this.addStorageKey(storageKey);
    }
    this.#enabled = true;
  }
  clearForOrigin(origin) {
    this.removeOrigin(origin);
    this.addOrigin(origin);
  }
  clearForStorageKey(storageKey) {
    this.removeStorageKey(storageKey);
    this.addStorageKey(storageKey);
  }
  refreshCacheNames() {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    const securityOrigins = this.#securityOriginManager.securityOrigins();
    for (const securityOrigin of securityOrigins) {
      void this.loadCacheNames(securityOrigin, void 0);
    }
    const storageKeys = this.#storageKeyManager.storageKeys();
    for (const storageKey of storageKeys) {
      void this.loadCacheNames(void 0, storageKey);
    }
  }
  async deleteCache(cache) {
    const response = await this.cacheAgent.invoke_deleteCache({ cacheId: cache.cacheId });
    if (response.getError()) {
      console.error(`ServiceWorkerCacheAgent error deleting cache ${cache.toString()}: ${response.getError()}`);
      return;
    }
    this.#cachesInternal.delete(cache.cacheId);
    this.cacheRemoved(cache);
  }
  async deleteCacheEntry(cache, request) {
    const response = await this.cacheAgent.invoke_deleteEntry({ cacheId: cache.cacheId, request });
    if (response.getError()) {
      Common.Console.Console.instance().error(i18nString(UIStrings.serviceworkercacheagentError, { PH1: cache.toString(), PH2: String(response.getError()) }));
      return;
    }
  }
  loadCacheData(cache, skipCount, pageSize, pathFilter, callback) {
    void this.requestEntries(cache, skipCount, pageSize, pathFilter, callback);
  }
  loadAllCacheData(cache, pathFilter, callback) {
    void this.requestAllEntries(cache, pathFilter, callback);
  }
  caches() {
    const caches = new Array();
    for (const cache of this.#cachesInternal.values()) {
      caches.push(cache);
    }
    return caches;
  }
  dispose() {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    if (this.#enabled) {
      this.#securityOriginManager.removeEventListener(SecurityOriginManagerEvents.SecurityOriginAdded, this.securityOriginAdded, this);
      this.#securityOriginManager.removeEventListener(SecurityOriginManagerEvents.SecurityOriginRemoved, this.securityOriginRemoved, this);
      this.#storageKeyManager.removeEventListener(StorageKeyManagerEvents.StorageKeyAdded, this.storageKeyAdded, this);
      this.#storageKeyManager.removeEventListener(StorageKeyManagerEvents.StorageKeyRemoved, this.storageKeyRemoved, this);
    }
  }
  addOrigin(securityOrigin) {
    void this.loadCacheNames(securityOrigin, void 0);
    if (this.isValidSecurityOrigin(securityOrigin)) {
      void this.#storageAgent.invoke_trackCacheStorageForOrigin({ origin: securityOrigin });
    }
  }
  addStorageKey(storageKey) {
    void this.loadCacheNames(void 0, storageKey);
    void this.#storageAgent.invoke_trackCacheStorageForStorageKey({ storageKey });
  }
  removeOrigin(securityOrigin) {
    for (const [opaqueId, cache] of this.#cachesInternal.entries()) {
      if (cache.securityOrigin === securityOrigin) {
        this.#cachesInternal.delete(opaqueId);
        this.cacheRemoved(cache);
      }
    }
    if (this.isValidSecurityOrigin(securityOrigin)) {
      void this.#storageAgent.invoke_untrackCacheStorageForOrigin({ origin: securityOrigin });
    }
  }
  removeStorageKey(storageKey) {
    for (const [opaqueId, cache] of this.#cachesInternal.entries()) {
      if (cache.storageKey === storageKey) {
        this.#cachesInternal.delete(opaqueId);
        this.cacheRemoved(cache);
      }
    }
    void this.#storageAgent.invoke_untrackCacheStorageForStorageKey({ storageKey });
  }
  isValidSecurityOrigin(securityOrigin) {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(securityOrigin);
    return parsedURL !== null && parsedURL.scheme.startsWith("http");
  }
  async loadCacheNames(securityOrigin, storageKey) {
    let response;
    if (storageKey) {
      response = await this.cacheAgent.invoke_requestCacheNames({ storageKey });
    } else {
      response = await this.cacheAgent.invoke_requestCacheNames({ securityOrigin });
    }
    if (response.getError()) {
      return;
    }
    this.updateCacheNames(securityOrigin, storageKey, response.caches);
  }
  updateCacheNames(securityOrigin, storageKey, cachesJson) {
    function deleteAndSaveOldCaches(cache) {
      if ((cache.securityOrigin === securityOrigin || cache.storageKey === storageKey) && !updatingCachesIds.has(cache.cacheId)) {
        oldCaches.set(cache.cacheId, cache);
        this.#cachesInternal.delete(cache.cacheId);
      }
    }
    const updatingCachesIds = /* @__PURE__ */ new Set();
    const newCaches = /* @__PURE__ */ new Map();
    const oldCaches = /* @__PURE__ */ new Map();
    for (const cacheJson of cachesJson) {
      const cache = new Cache(this, cacheJson.securityOrigin, cacheJson.storageKey, cacheJson.cacheName, cacheJson.cacheId);
      updatingCachesIds.add(cache.cacheId);
      if (this.#cachesInternal.has(cache.cacheId)) {
        continue;
      }
      newCaches.set(cache.cacheId, cache);
      this.#cachesInternal.set(cache.cacheId, cache);
    }
    this.#cachesInternal.forEach(deleteAndSaveOldCaches, this);
    newCaches.forEach(this.cacheAdded, this);
    oldCaches.forEach(this.cacheRemoved, this);
  }
  securityOriginAdded(event) {
    this.addOrigin(event.data);
  }
  storageKeyAdded(event) {
    this.addStorageKey(event.data);
  }
  securityOriginRemoved(event) {
    this.removeOrigin(event.data);
  }
  storageKeyRemoved(event) {
    this.removeStorageKey(event.data);
  }
  cacheAdded(cache) {
    this.dispatchEventToListeners(Events.CacheAdded, { model: this, cache });
  }
  cacheRemoved(cache) {
    this.dispatchEventToListeners(Events.CacheRemoved, { model: this, cache });
  }
  async requestEntries(cache, skipCount, pageSize, pathFilter, callback) {
    const response = await this.cacheAgent.invoke_requestEntries({ cacheId: cache.cacheId, skipCount, pageSize, pathFilter });
    if (response.getError()) {
      console.error("ServiceWorkerCacheAgent error while requesting entries: ", response.getError());
      return;
    }
    callback(response.cacheDataEntries, response.returnCount);
  }
  async requestAllEntries(cache, pathFilter, callback) {
    const response = await this.cacheAgent.invoke_requestEntries({ cacheId: cache.cacheId, pathFilter });
    if (response.getError()) {
      console.error("ServiceWorkerCacheAgent error while requesting entries: ", response.getError());
      return;
    }
    callback(response.cacheDataEntries, response.returnCount);
  }
  cacheStorageListUpdated({ origin, storageKey }) {
    this.#originsUpdated.add(origin);
    this.#storageKeysUpdated.add(storageKey);
    void this.#throttler.schedule(() => {
      const promises = Array.from(this.#originsUpdated, (origin2) => this.loadCacheNames(origin2, void 0));
      this.#originsUpdated.clear();
      return Promise.all(promises);
    }, this.#scheduleAsSoonAsPossible);
    void this.#throttler.schedule(() => {
      const promises = Array.from(this.#storageKeysUpdated, (key) => this.loadCacheNames(void 0, key));
      this.#storageKeysUpdated.clear();
      return Promise.all(promises);
    }, this.#scheduleAsSoonAsPossible);
  }
  cacheStorageContentUpdated({ origin, storageKey, cacheName }) {
    this.dispatchEventToListeners(Events.CacheStorageContentUpdated, { origin, storageKey, cacheName });
  }
  indexedDBListUpdated(_event) {
  }
  indexedDBContentUpdated(_event) {
  }
  interestGroupAccessed(_event) {
  }
  sharedStorageAccessed(_event) {
  }
  setThrottlerSchedulesAsSoonAsPossibleForTest() {
    this.#scheduleAsSoonAsPossible = true;
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["CacheAdded"] = "CacheAdded";
  Events2["CacheRemoved"] = "CacheRemoved";
  Events2["CacheStorageContentUpdated"] = "CacheStorageContentUpdated";
  return Events2;
})(Events || {});
export class Cache {
  #model;
  securityOrigin;
  storageKey;
  cacheName;
  cacheId;
  constructor(model, securityOrigin, storageKey, cacheName, cacheId) {
    this.#model = model;
    this.securityOrigin = securityOrigin;
    this.storageKey = storageKey;
    this.cacheName = cacheName;
    this.cacheId = cacheId;
  }
  equals(cache) {
    return this.cacheId === cache.cacheId;
  }
  toString() {
    return this.securityOrigin + this.cacheName;
  }
  async requestCachedResponse(url, requestHeaders) {
    const response = await this.#model.cacheAgent.invoke_requestCachedResponse({ cacheId: this.cacheId, requestURL: url, requestHeaders });
    if (response.getError()) {
      return null;
    }
    return response.response;
  }
}
SDKModel.register(ServiceWorkerCacheModel, { capabilities: Capability.Storage, autostart: false });
//# sourceMappingURL=ServiceWorkerCacheModel.js.map
