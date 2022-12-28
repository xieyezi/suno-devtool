import * as Common from "../../core/common/common.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as Workspace from "../workspace/workspace.js";
import { ContentProviderBasedProject } from "./ContentProviderBasedProject.js";
const uiSourceCodeToScriptsMap = /* @__PURE__ */ new WeakMap();
const scriptToUISourceCodeMap = /* @__PURE__ */ new WeakMap();
export class DefaultScriptMapping {
  #debuggerModel;
  #debuggerWorkspaceBinding;
  #project;
  #eventListeners;
  #uiSourceCodeToScriptsMap;
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this.#debuggerModel = debuggerModel;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#project = new ContentProviderBasedProject(workspace, "debugger:" + debuggerModel.target().id(), Workspace.Workspace.projectTypes.Debugger, "", true);
    this.#eventListeners = [
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.debuggerReset, this),
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this),
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.DiscardedAnonymousScriptSource, this.discardedScriptSource, this)
    ];
    this.#uiSourceCodeToScriptsMap = /* @__PURE__ */ new WeakMap();
  }
  static createV8ScriptURL(script) {
    const name = Common.ParsedURL.ParsedURL.extractName(script.sourceURL);
    const url = "debugger:///VM" + script.scriptId + (name ? " " + name : "");
    return url;
  }
  static scriptForUISourceCode(uiSourceCode) {
    const scripts = uiSourceCodeToScriptsMap.get(uiSourceCode);
    return scripts ? scripts.values().next().value : null;
  }
  static rawLineColumnToScriptLineColumn(script, rawLineNumber, rawColumnNumber) {
    const isInlineScriptWithoutSourceUrl = !script.hasSourceURL && script.isInlineScript();
    const lineNumber = rawLineNumber - (isInlineScriptWithoutSourceUrl ? script.lineOffset : 0);
    let columnNumber = rawColumnNumber;
    if (isInlineScriptWithoutSourceUrl && !lineNumber && columnNumber) {
      columnNumber -= script.columnOffset;
    }
    return { lineNumber, columnNumber };
  }
  static scriptLineColumnToRawLineColumn(script, scriptLineNumber, scriptColumnNumber) {
    let lineNumber = scriptLineNumber;
    let columnNumber = scriptColumnNumber;
    const isInlineScriptWithoutSourceUrl = !script.hasSourceURL && script.isInlineScript();
    if (isInlineScriptWithoutSourceUrl) {
      if (lineNumber === 0 && columnNumber !== void 0) {
        columnNumber += script.columnOffset;
      }
      lineNumber += script.lineOffset;
    }
    return { lineNumber, columnNumber };
  }
  rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const uiSourceCode = scriptToUISourceCodeMap.get(script);
    if (!uiSourceCode) {
      return null;
    }
    const { lineNumber, columnNumber } = DefaultScriptMapping.rawLineColumnToScriptLineColumn(script, rawLocation.lineNumber, rawLocation.columnNumber);
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const script = this.#uiSourceCodeToScriptsMap.get(uiSourceCode);
    if (!script) {
      return [];
    }
    ({ lineNumber, columnNumber } = DefaultScriptMapping.scriptLineColumnToRawLineColumn(script, lineNumber, columnNumber));
    return [this.#debuggerModel.createRawLocation(script, lineNumber, columnNumber ?? 0)];
  }
  parsedScriptSource(event) {
    const script = event.data;
    const url = DefaultScriptMapping.createV8ScriptURL(script);
    const uiSourceCode = this.#project.createUISourceCode(url, Common.ResourceType.resourceTypes.Script);
    this.#uiSourceCodeToScriptsMap.set(uiSourceCode, script);
    const scriptSet = uiSourceCodeToScriptsMap.get(uiSourceCode);
    if (!scriptSet) {
      uiSourceCodeToScriptsMap.set(uiSourceCode, /* @__PURE__ */ new Set([script]));
    } else {
      scriptSet.add(script);
    }
    scriptToUISourceCodeMap.set(script, uiSourceCode);
    this.#project.addUISourceCodeWithProvider(uiSourceCode, script, null, "text/javascript");
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }
  discardedScriptSource(event) {
    const script = event.data;
    const uiSourceCode = scriptToUISourceCodeMap.get(script);
    if (!uiSourceCode) {
      return;
    }
    scriptToUISourceCodeMap.delete(script);
    this.#uiSourceCodeToScriptsMap.delete(uiSourceCode);
    const scripts = uiSourceCodeToScriptsMap.get(uiSourceCode);
    if (scripts) {
      scripts.delete(script);
      if (!scripts.size) {
        uiSourceCodeToScriptsMap.delete(uiSourceCode);
      }
    }
    this.#project.removeUISourceCode(uiSourceCode.url());
  }
  debuggerReset() {
    this.#project.reset();
  }
  dispose() {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.debuggerReset();
    this.#project.dispose();
  }
}
//# sourceMappingURL=DefaultScriptMapping.js.map
