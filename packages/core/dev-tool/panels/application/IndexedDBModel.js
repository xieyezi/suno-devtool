import * as Common from "../../core/common/common.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as Protocol from "../../generated/protocol.js";
export class IndexedDBModel extends SDK.SDKModel.SDKModel {
  storageKeyManager;
  indexedDBAgent;
  storageAgent;
  databasesInternal;
  databaseNamesByStorageKey;
  updatedStorageKeys;
  throttler;
  enabled;
  constructor(target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    this.indexedDBAgent = target.indexedDBAgent();
    this.storageAgent = target.storageAgent();
    this.databasesInternal = /* @__PURE__ */ new Map();
    this.databaseNamesByStorageKey = /* @__PURE__ */ new Map();
    this.updatedStorageKeys = /* @__PURE__ */ new Set();
    this.throttler = new Common.Throttler.Throttler(1e3);
  }
  static keyFromIDBKey(idbKey) {
    if (typeof idbKey === "undefined" || idbKey === null) {
      return void 0;
    }
    let key;
    switch (typeof idbKey) {
      case "number":
        key = {
          type: Protocol.IndexedDB.KeyType.Number,
          number: idbKey
        };
        break;
      case "string":
        key = {
          type: Protocol.IndexedDB.KeyType.String,
          string: idbKey
        };
        break;
      case "object":
        if (idbKey instanceof Date) {
          key = {
            type: Protocol.IndexedDB.KeyType.Date,
            date: idbKey.getTime()
          };
        } else if (Array.isArray(idbKey)) {
          const array = [];
          for (let i = 0; i < idbKey.length; ++i) {
            const nestedKey = IndexedDBModel.keyFromIDBKey(idbKey[i]);
            if (nestedKey) {
              array.push(nestedKey);
            }
          }
          key = {
            type: Protocol.IndexedDB.KeyType.Array,
            array
          };
        } else {
          return void 0;
        }
        break;
      default:
        return void 0;
    }
    return key;
  }
  static keyRangeFromIDBKeyRange(idbKeyRange) {
    return {
      lower: IndexedDBModel.keyFromIDBKey(idbKeyRange.lower),
      upper: IndexedDBModel.keyFromIDBKey(idbKeyRange.upper),
      lowerOpen: Boolean(idbKeyRange.lowerOpen),
      upperOpen: Boolean(idbKeyRange.upperOpen)
    };
  }
  static idbKeyPathFromKeyPath(keyPath) {
    let idbKeyPath;
    switch (keyPath.type) {
      case Protocol.IndexedDB.KeyPathType.Null:
        idbKeyPath = null;
        break;
      case Protocol.IndexedDB.KeyPathType.String:
        idbKeyPath = keyPath.string;
        break;
      case Protocol.IndexedDB.KeyPathType.Array:
        idbKeyPath = keyPath.array;
        break;
    }
    return idbKeyPath;
  }
  static keyPathStringFromIDBKeyPath(idbKeyPath) {
    if (typeof idbKeyPath === "string") {
      return '"' + idbKeyPath + '"';
    }
    if (idbKeyPath instanceof Array) {
      return '["' + idbKeyPath.join('", "') + '"]';
    }
    return null;
  }
  enable() {
    if (this.enabled) {
      return;
    }
    void this.indexedDBAgent.invoke_enable();
    if (this.storageKeyManager) {
      this.storageKeyManager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyAdded, this.storageKeyAdded, this);
      this.storageKeyManager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyRemoved, this.storageKeyRemoved, this);
      for (const storageKey of this.storageKeyManager.storageKeys()) {
        this.addStorageKey(storageKey);
      }
    }
    this.enabled = true;
  }
  clearForStorageKey(storageKey) {
    if (!this.enabled || !this.databaseNamesByStorageKey.has(storageKey)) {
      return;
    }
    this.removeStorageKey(storageKey);
    this.addStorageKey(storageKey);
  }
  async deleteDatabase(databaseId) {
    if (!this.enabled) {
      return;
    }
    await this.indexedDBAgent.invoke_deleteDatabase({ storageKey: databaseId.storageKey, databaseName: databaseId.name });
    void this.loadDatabaseNamesByStorageKey(databaseId.storageKey);
  }
  async refreshDatabaseNames() {
    for (const storageKey of this.databaseNamesByStorageKey.keys()) {
      await this.loadDatabaseNamesByStorageKey(storageKey);
    }
    this.dispatchEventToListeners(Events.DatabaseNamesRefreshed);
  }
  refreshDatabase(databaseId) {
    void this.loadDatabase(databaseId, true);
  }
  async clearObjectStore(databaseId, objectStoreName) {
    await this.indexedDBAgent.invoke_clearObjectStore({ storageKey: databaseId.storageKey, databaseName: databaseId.name, objectStoreName });
  }
  async deleteEntries(databaseId, objectStoreName, idbKeyRange) {
    const keyRange = IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);
    await this.indexedDBAgent.invoke_deleteObjectStoreEntries({ storageKey: databaseId.storageKey, databaseName: databaseId.name, objectStoreName, keyRange });
  }
  storageKeyAdded(event) {
    this.addStorageKey(event.data);
  }
  storageKeyRemoved(event) {
    this.removeStorageKey(event.data);
  }
  addStorageKey(storageKey) {
    console.assert(!this.databaseNamesByStorageKey.has(storageKey));
    this.databaseNamesByStorageKey.set(storageKey, /* @__PURE__ */ new Set());
    void this.loadDatabaseNamesByStorageKey(storageKey);
    void this.storageAgent.invoke_trackIndexedDBForStorageKey({ storageKey });
  }
  removeStorageKey(storageKey) {
    console.assert(this.databaseNamesByStorageKey.has(storageKey));
    for (const name of this.databaseNamesByStorageKey.get(storageKey) || []) {
      this.databaseRemovedForStorageKey(storageKey, name);
    }
    this.databaseNamesByStorageKey.delete(storageKey);
    void this.storageAgent.invoke_untrackIndexedDBForStorageKey({ storageKey });
  }
  updateStorageKeyDatabaseNames(storageKey, databaseNames) {
    const newDatabaseNames = new Set(databaseNames);
    const oldDatabaseNames = new Set(this.databaseNamesByStorageKey.get(storageKey));
    this.databaseNamesByStorageKey.set(storageKey, newDatabaseNames);
    for (const databaseName of oldDatabaseNames) {
      if (!newDatabaseNames.has(databaseName)) {
        this.databaseRemovedForStorageKey(storageKey, databaseName);
      }
    }
    for (const databaseName of newDatabaseNames) {
      if (!oldDatabaseNames.has(databaseName)) {
        this.databaseAddedForStorageKey(storageKey, databaseName);
      }
    }
  }
  databases() {
    const result = [];
    for (const [storageKey, databaseNames] of this.databaseNamesByStorageKey) {
      for (const name of databaseNames) {
        result.push(new DatabaseId(storageKey, name));
      }
    }
    return result;
  }
  databaseAddedForStorageKey(storageKey, databaseName) {
    const databaseId = new DatabaseId(storageKey, databaseName);
    this.dispatchEventToListeners(Events.DatabaseAdded, { model: this, databaseId });
  }
  databaseRemovedForStorageKey(storageKey, databaseName) {
    const databaseId = new DatabaseId(storageKey, databaseName);
    this.dispatchEventToListeners(Events.DatabaseRemoved, { model: this, databaseId });
  }
  async loadDatabaseNamesByStorageKey(storageKey) {
    const { databaseNames } = await this.indexedDBAgent.invoke_requestDatabaseNames({ storageKey });
    if (!databaseNames) {
      return [];
    }
    if (!this.databaseNamesByStorageKey.has(storageKey)) {
      return [];
    }
    this.updateStorageKeyDatabaseNames(storageKey, databaseNames);
    return databaseNames;
  }
  async loadDatabase(databaseId, entriesUpdated) {
    const databaseWithObjectStores = (await this.indexedDBAgent.invoke_requestDatabase({
      storageKey: databaseId.storageKey,
      databaseName: databaseId.name
    })).databaseWithObjectStores;
    if (!this.databaseNamesByStorageKey.has(databaseId.storageKey)) {
      return;
    }
    if (!databaseWithObjectStores) {
      return;
    }
    const databaseModel = new Database(databaseId, databaseWithObjectStores.version);
    this.databasesInternal.set(databaseId, databaseModel);
    for (const objectStore of databaseWithObjectStores.objectStores) {
      const objectStoreIDBKeyPath = IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);
      const objectStoreModel = new ObjectStore(objectStore.name, objectStoreIDBKeyPath, objectStore.autoIncrement);
      for (let j = 0; j < objectStore.indexes.length; ++j) {
        const index = objectStore.indexes[j];
        const indexIDBKeyPath = IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);
        const indexModel = new Index(index.name, indexIDBKeyPath, index.unique, index.multiEntry);
        objectStoreModel.indexes.set(indexModel.name, indexModel);
      }
      databaseModel.objectStores.set(objectStoreModel.name, objectStoreModel);
    }
    this.dispatchEventToListeners(Events.DatabaseLoaded, { model: this, database: databaseModel, entriesUpdated });
  }
  loadObjectStoreData(databaseId, objectStoreName, idbKeyRange, skipCount, pageSize, callback) {
    void this.requestData(databaseId, databaseId.name, objectStoreName, "", idbKeyRange, skipCount, pageSize, callback);
  }
  loadIndexData(databaseId, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback) {
    void this.requestData(databaseId, databaseId.name, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback);
  }
  async requestData(databaseId, databaseName, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback) {
    const keyRange = idbKeyRange ? IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange) : void 0;
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    const response = await this.indexedDBAgent.invoke_requestData({
      storageKey: databaseId.storageKey,
      databaseName,
      objectStoreName,
      indexName,
      skipCount,
      pageSize,
      keyRange
    });
    if (!runtimeModel || !this.databaseNamesByStorageKey.has(databaseId.storageKey)) {
      return;
    }
    if (response.getError()) {
      console.error("IndexedDBAgent error: " + response.getError());
      return;
    }
    const dataEntries = response.objectStoreDataEntries;
    const entries = [];
    for (const dataEntry of dataEntries) {
      const key = runtimeModel?.createRemoteObject(dataEntry.key);
      const primaryKey = runtimeModel?.createRemoteObject(dataEntry.primaryKey);
      const value = runtimeModel?.createRemoteObject(dataEntry.value);
      if (!key || !primaryKey || !value) {
        return;
      }
      entries.push(new Entry(key, primaryKey, value));
    }
    callback(entries, response.hasMore);
  }
  async getMetadata(databaseId, objectStore) {
    const databaseName = databaseId.name;
    const objectStoreName = objectStore.name;
    const response = await this.indexedDBAgent.invoke_getMetadata({ storageKey: databaseId.storageKey, databaseName, objectStoreName });
    if (response.getError()) {
      console.error("IndexedDBAgent error: " + response.getError());
      return null;
    }
    return { entriesCount: response.entriesCount, keyGeneratorValue: response.keyGeneratorValue };
  }
  async refreshDatabaseListForStorageKey(storageKey) {
    const databaseNames = await this.loadDatabaseNamesByStorageKey(storageKey);
    for (const databaseName of databaseNames) {
      void this.loadDatabase(new DatabaseId(storageKey, databaseName), false);
    }
  }
  indexedDBListUpdated({ storageKey }) {
    if (storageKey) {
      this.updatedStorageKeys.add(storageKey);
      void this.throttler.schedule(() => {
        const promises = Array.from(this.updatedStorageKeys, (storageKey2) => {
          void this.refreshDatabaseListForStorageKey(storageKey2);
        });
        this.updatedStorageKeys.clear();
        return Promise.all(promises);
      });
    }
  }
  indexedDBContentUpdated({ storageKey, databaseName, objectStoreName }) {
    const databaseId = new DatabaseId(storageKey, databaseName);
    this.dispatchEventToListeners(Events.IndexedDBContentUpdated, { databaseId, objectStoreName, model: this });
  }
  cacheStorageListUpdated(_event) {
  }
  cacheStorageContentUpdated(_event) {
  }
  interestGroupAccessed(_event) {
  }
  sharedStorageAccessed(_event) {
  }
}
SDK.SDKModel.SDKModel.register(IndexedDBModel, { capabilities: SDK.Target.Capability.Storage, autostart: false });
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["DatabaseAdded"] = "DatabaseAdded";
  Events2["DatabaseRemoved"] = "DatabaseRemoved";
  Events2["DatabaseLoaded"] = "DatabaseLoaded";
  Events2["DatabaseNamesRefreshed"] = "DatabaseNamesRefreshed";
  Events2["IndexedDBContentUpdated"] = "IndexedDBContentUpdated";
  return Events2;
})(Events || {});
export class Entry {
  key;
  primaryKey;
  value;
  constructor(key, primaryKey, value) {
    this.key = key;
    this.primaryKey = primaryKey;
    this.value = value;
  }
}
export class DatabaseId {
  storageKey;
  name;
  constructor(storageKey, name) {
    this.storageKey = storageKey;
    this.name = name;
  }
  equals(databaseId) {
    return this.name === databaseId.name && this.storageKey === databaseId.storageKey;
  }
}
export class Database {
  databaseId;
  version;
  objectStores;
  constructor(databaseId, version) {
    this.databaseId = databaseId;
    this.version = version;
    this.objectStores = /* @__PURE__ */ new Map();
  }
}
export class ObjectStore {
  name;
  keyPath;
  autoIncrement;
  indexes;
  constructor(name, keyPath, autoIncrement) {
    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;
    this.indexes = /* @__PURE__ */ new Map();
  }
  get keyPathString() {
    return IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
  }
}
export class Index {
  name;
  keyPath;
  unique;
  multiEntry;
  constructor(name, keyPath, unique, multiEntry) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
    this.multiEntry = multiEntry;
  }
  get keyPathString() {
    return IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
  }
}
//# sourceMappingURL=IndexedDBModel.js.map
