import * as Common from "../common/common.js";
import * as Platform from "../platform/platform.js";
import { Type } from "./Target.js";
import { Events as TargetManagerEvents, TargetManager } from "./TargetManager.js";
import { TextSourceMap } from "./SourceMap.js";
export class SourceMapManager extends Common.ObjectWrapper.ObjectWrapper {
  #target;
  #isEnabled;
  #clientData;
  #sourceMaps;
  constructor(target) {
    super();
    this.#target = target;
    this.#isEnabled = true;
    this.#clientData = /* @__PURE__ */ new Map();
    this.#sourceMaps = /* @__PURE__ */ new Map();
    TargetManager.instance().addEventListener(TargetManagerEvents.InspectedURLChanged, this.inspectedURLChanged, this);
  }
  setEnabled(isEnabled) {
    if (isEnabled === this.#isEnabled) {
      return;
    }
    this.#isEnabled = isEnabled;
    const clientData = [...this.#clientData.entries()];
    for (const [client, { relativeSourceURL, relativeSourceMapURL }] of clientData) {
      this.detachSourceMap(client);
      this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
    }
  }
  static getBaseUrl(target) {
    while (target && target.type() !== Type.Frame) {
      target = target.parentTarget();
    }
    return target?.inspectedURL() ?? Platform.DevToolsPath.EmptyUrlString;
  }
  static resolveRelativeSourceURL(target, url) {
    url = Common.ParsedURL.ParsedURL.completeURL(SourceMapManager.getBaseUrl(target), url) ?? url;
    return url;
  }
  inspectedURLChanged(event) {
    if (event.data !== this.#target) {
      return;
    }
    const clientData = [...this.#clientData.entries()];
    for (const [client, { relativeSourceURL, relativeSourceMapURL }] of clientData) {
      this.detachSourceMap(client);
      this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
    }
  }
  sourceMapForClient(client) {
    return this.#clientData.get(client)?.sourceMap;
  }
  sourceMapForClientPromise(client) {
    const clientData = this.#clientData.get(client);
    if (!clientData) {
      return Promise.resolve(void 0);
    }
    return clientData.sourceMapPromise;
  }
  clientForSourceMap(sourceMap) {
    return this.#sourceMaps.get(sourceMap);
  }
  attachSourceMap(client, relativeSourceURL, relativeSourceMapURL) {
    if (this.#clientData.has(client)) {
      throw new Error("SourceMap is already attached or being attached to client");
    }
    if (!relativeSourceMapURL) {
      return;
    }
    const clientData = {
      relativeSourceURL,
      relativeSourceMapURL,
      sourceMap: void 0,
      sourceMapPromise: Promise.resolve(void 0)
    };
    if (this.#isEnabled) {
      const sourceURL = SourceMapManager.resolveRelativeSourceURL(this.#target, relativeSourceURL);
      const sourceMapURL = Common.ParsedURL.ParsedURL.completeURL(sourceURL, relativeSourceMapURL);
      if (sourceMapURL) {
        this.dispatchEventToListeners(Events.SourceMapWillAttach, { client });
        const initiator = client.createPageResourceLoadInitiator();
        clientData.sourceMapPromise = TextSourceMap.load(sourceMapURL, sourceURL, initiator).then((sourceMap) => {
          if (this.#clientData.get(client) === clientData) {
            clientData.sourceMap = sourceMap;
            this.#sourceMaps.set(sourceMap, client);
            this.dispatchEventToListeners(Events.SourceMapAttached, { client, sourceMap });
          }
          return sourceMap;
        }, (error) => {
          Common.Console.Console.instance().warn(`DevTools failed to load source map: ${error.message}`);
          if (this.#clientData.get(client) === clientData) {
            this.dispatchEventToListeners(Events.SourceMapFailedToAttach, { client });
          }
          return void 0;
        });
      }
    }
    this.#clientData.set(client, clientData);
  }
  detachSourceMap(client) {
    const clientData = this.#clientData.get(client);
    if (!clientData) {
      return;
    }
    this.#clientData.delete(client);
    const { sourceMap } = clientData;
    if (sourceMap) {
      this.#sourceMaps.delete(sourceMap);
      this.dispatchEventToListeners(Events.SourceMapDetached, { client, sourceMap });
    } else {
      this.dispatchEventToListeners(Events.SourceMapFailedToAttach, { client });
    }
  }
  dispose() {
    TargetManager.instance().removeEventListener(TargetManagerEvents.InspectedURLChanged, this.inspectedURLChanged, this);
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["SourceMapWillAttach"] = "SourceMapWillAttach";
  Events2["SourceMapFailedToAttach"] = "SourceMapFailedToAttach";
  Events2["SourceMapAttached"] = "SourceMapAttached";
  Events2["SourceMapDetached"] = "SourceMapDetached";
  return Events2;
})(Events || {});
//# sourceMappingURL=SourceMapManager.js.map
