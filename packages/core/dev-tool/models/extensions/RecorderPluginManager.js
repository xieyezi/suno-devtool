import * as Common from "../../core/common/common.js";
let instance = null;
export class RecorderPluginManager extends Common.ObjectWrapper.ObjectWrapper {
  #plugins = /* @__PURE__ */ new Set();
  static instance() {
    if (!instance) {
      instance = new RecorderPluginManager();
    }
    return instance;
  }
  addPlugin(plugin) {
    this.#plugins.add(plugin);
    this.dispatchEventToListeners(Events.PluginAdded, plugin);
  }
  removePlugin(plugin) {
    this.#plugins.delete(plugin);
    this.dispatchEventToListeners(Events.PluginRemoved, plugin);
  }
  plugins() {
    return Array.from(this.#plugins.values());
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["PluginAdded"] = "pluginAdded";
  Events2["PluginRemoved"] = "pluginRemoved";
  return Events2;
})(Events || {});
//# sourceMappingURL=RecorderPluginManager.js.map
