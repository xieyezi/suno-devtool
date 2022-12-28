import * as Common from "../../core/common/common.js";
import * as Root from "../../core/root/root.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as Workspace from "../workspace/workspace.js";
import { DebuggerWorkspaceBinding } from "./DebuggerWorkspaceBinding.js";
import { LiveLocationPool } from "./LiveLocation.js";
import { DefaultScriptMapping } from "./DefaultScriptMapping.js";
import { assertNotNullOrUndefined } from "../../core/platform/platform.js";
let breakpointManagerInstance;
export class BreakpointManager extends Common.ObjectWrapper.ObjectWrapper {
  storage;
  #workspace;
  targetManager;
  debuggerWorkspaceBinding;
  #breakpointsForHomeUISourceCode;
  #breakpointsForUISourceCode;
  #breakpointByStorageId;
  #updateBindingsCallbacks;
  constructor(targetManager, workspace, debuggerWorkspaceBinding) {
    super();
    this.storage = new Storage();
    this.#workspace = workspace;
    this.targetManager = targetManager;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#breakpointsForUISourceCode = /* @__PURE__ */ new Map();
    this.#breakpointsForHomeUISourceCode = /* @__PURE__ */ new Map();
    this.#breakpointByStorageId = /* @__PURE__ */ new Map();
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
    this.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
    this.#updateBindingsCallbacks = [];
  }
  static instance(opts = { forceNew: null, targetManager: null, workspace: null, debuggerWorkspaceBinding: null }) {
    const { forceNew, targetManager, workspace, debuggerWorkspaceBinding } = opts;
    if (!breakpointManagerInstance || forceNew) {
      if (!targetManager || !workspace || !debuggerWorkspaceBinding) {
        throw new Error(`Unable to create settings: targetManager, workspace, and debuggerWorkspaceBinding must be provided: ${new Error().stack}`);
      }
      breakpointManagerInstance = new BreakpointManager(targetManager, workspace, debuggerWorkspaceBinding);
    }
    return breakpointManagerInstance;
  }
  static breakpointStorageId(url, lineNumber, columnNumber) {
    if (!url) {
      return "";
    }
    return `${url}:${lineNumber}` + (typeof columnNumber === "number" ? `:${columnNumber}` : "");
  }
  modelAdded(debuggerModel) {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS)) {
      debuggerModel.setSynchronizeBreakpointsCallback(this.restoreBreakpointsForScript.bind(this));
    }
  }
  modelRemoved(debuggerModel) {
    debuggerModel.setSynchronizeBreakpointsCallback(null);
  }
  addUpdateBindingsCallback(callback) {
    this.#updateBindingsCallbacks.push(callback);
  }
  async copyBreakpoints(fromURL, toSourceCode) {
    const breakpointItems = this.storage.breakpointItems(fromURL);
    for (const item of breakpointItems) {
      await this.setBreakpoint(toSourceCode, item.lineNumber, item.columnNumber, item.condition, item.enabled, BreakpointOrigin.OTHER);
    }
  }
  async restoreBreakpointsForScript(script) {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS)) {
      return;
    }
    if (!script.sourceURL) {
      return;
    }
    const uiSourceCode = await this.getUISourceCodeWithUpdatedBreakpointInfo(script);
    if (this.#hasBreakpointsForUrl(script.sourceURL)) {
      await this.#restoreBreakpointsForUrl(uiSourceCode);
    }
    const debuggerModel = script.debuggerModel;
    const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    if (sourceMap) {
      for (const sourceURL of sourceMap.sourceURLs()) {
        if (this.#hasBreakpointsForUrl(sourceURL)) {
          const uiSourceCode2 = await this.debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(debuggerModel, sourceURL, script.isContentScript());
          await this.#restoreBreakpointsForUrl(uiSourceCode2);
        }
      }
    }
    const { pluginManager } = this.debuggerWorkspaceBinding;
    if (pluginManager) {
      const sourceUrls = await pluginManager.getSourcesForScript(script);
      if (Array.isArray(sourceUrls)) {
        for (const sourceURL of sourceUrls) {
          if (this.#hasBreakpointsForUrl(sourceURL)) {
            const uiSourceCode2 = await this.debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(debuggerModel, sourceURL);
            assertNotNullOrUndefined(uiSourceCode2);
            await this.#restoreBreakpointsForUrl(uiSourceCode2);
          }
        }
      }
    }
  }
  async getUISourceCodeWithUpdatedBreakpointInfo(script) {
    const isSnippet = script.sourceURL.startsWith("snippet://");
    const projectType = isSnippet ? Workspace.Workspace.projectTypes.Network : void 0;
    const isInlineScriptWithoutSourceURL = script.isInlineScript() && !script.hasSourceURL;
    const hasResourceScriptMapping = !script.isLiveEdit() && script.sourceURL && script.hasSourceURL;
    let sourceURL = script.sourceURL;
    if (isInlineScriptWithoutSourceURL) {
      sourceURL = DefaultScriptMapping.createV8ScriptURL(script);
    } else if (hasResourceScriptMapping) {
      sourceURL = SDK.SourceMapManager.SourceMapManager.resolveRelativeSourceURL(script.debuggerModel.target(), script.sourceURL);
    }
    const uiSourceCode = await Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURLPromise(sourceURL, projectType);
    if (this.#updateBindingsCallbacks.length > 0) {
      const promises = [];
      for (const callback of this.#updateBindingsCallbacks) {
        promises.push(callback(uiSourceCode));
      }
      await Promise.all(promises);
    }
    return uiSourceCode;
  }
  async #restoreBreakpointsForUrl(uiSourceCode) {
    this.restoreBreakpoints(uiSourceCode);
    const breakpoints = this.#breakpointByStorageId.values();
    const affectedBreakpoints = Array.from(breakpoints).filter((x) => x.uiSourceCodes.has(uiSourceCode));
    await Promise.all(affectedBreakpoints.map((bp) => bp.updateBreakpoint()));
  }
  #hasBreakpointsForUrl(url) {
    const breakpointItems = this.storage.breakpointItems(url);
    return breakpointItems.length > 0;
  }
  static getScriptForInlineUiSourceCode(uiSourceCode) {
    const script = DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);
    if (script && script.isInlineScript() && !script.hasSourceURL) {
      return script;
    }
    return null;
  }
  static breakpointLocationFromUiLocation(uiLocation) {
    const uiSourceCode = uiLocation.uiSourceCode;
    const script = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode);
    const { lineNumber, columnNumber } = script ? DefaultScriptMapping.scriptLineColumnToRawLineColumn(script, uiLocation.lineNumber, uiLocation.columnNumber) : uiLocation;
    return { lineNumber, columnNumber };
  }
  static uiLocationFromBreakpointLocation(uiSourceCode, lineNumber, columnNumber) {
    const script = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode);
    if (script) {
      ({ lineNumber, columnNumber } = DefaultScriptMapping.rawLineColumnToScriptLineColumn(script, lineNumber, columnNumber));
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  static isValidPositionInScript(lineNumber, columnNumber, script) {
    if (!script) {
      return true;
    }
    if (lineNumber < script.lineOffset || lineNumber > script.endLine) {
      return false;
    }
    if (lineNumber === script.lineOffset && columnNumber && columnNumber < script.columnOffset) {
      return false;
    }
    if (lineNumber === script.endLine && (!columnNumber || columnNumber >= script.endColumn)) {
      return false;
    }
    return true;
  }
  restoreBreakpoints(uiSourceCode) {
    const script = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode);
    const url = script?.sourceURL ?? uiSourceCode.url();
    if (!url) {
      return;
    }
    this.storage.mute();
    const breakpointItems = this.storage.breakpointItems(url);
    for (const item of breakpointItems) {
      const lineNumber = item.lineNumber;
      const columnNumber = item.columnNumber;
      if (!BreakpointManager.isValidPositionInScript(lineNumber, columnNumber, script)) {
        continue;
      }
      this.innerSetBreakpoint(uiSourceCode, lineNumber, columnNumber, item.condition, item.enabled, BreakpointOrigin.OTHER);
    }
    this.storage.unmute();
  }
  uiSourceCodeAdded(event) {
    const uiSourceCode = event.data;
    this.restoreBreakpoints(uiSourceCode);
  }
  uiSourceCodeRemoved(event) {
    const uiSourceCode = event.data;
    this.removeUISourceCode(uiSourceCode);
  }
  projectRemoved(event) {
    const project = event.data;
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.removeUISourceCode(uiSourceCode);
    }
  }
  removeUISourceCode(uiSourceCode) {
    const breakpoints = this.#getAllBreakpointsForUISourceCode(uiSourceCode);
    breakpoints.forEach((bp) => bp.removeUISourceCode(uiSourceCode));
  }
  async setBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled, origin) {
    let uiLocation = new Workspace.UISourceCode.UILocation(uiSourceCode, lineNumber, columnNumber);
    const normalizedLocation = await this.debuggerWorkspaceBinding.normalizeUILocation(uiLocation);
    if (normalizedLocation.id() !== uiLocation.id()) {
      void Common.Revealer.reveal(normalizedLocation);
      uiLocation = normalizedLocation;
    }
    const breakpointLocation = BreakpointManager.breakpointLocationFromUiLocation(uiLocation);
    return this.innerSetBreakpoint(uiLocation.uiSourceCode, breakpointLocation.lineNumber, breakpointLocation.columnNumber, condition, enabled, origin);
  }
  innerSetBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled, origin) {
    const url = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode)?.sourceURL ?? uiSourceCode.url();
    const itemId = BreakpointManager.breakpointStorageId(url, lineNumber, columnNumber);
    let breakpoint = this.#breakpointByStorageId.get(itemId);
    if (breakpoint) {
      breakpoint.updateState(condition, enabled);
      breakpoint.addUISourceCode(uiSourceCode);
      void breakpoint.updateBreakpoint();
      return breakpoint;
    }
    breakpoint = new Breakpoint(this, uiSourceCode, url, lineNumber, columnNumber, condition, enabled, origin);
    this.#breakpointByStorageId.set(itemId, breakpoint);
    return breakpoint;
  }
  findBreakpoint(uiLocation) {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    return breakpoints ? breakpoints.get(uiLocation.id()) || null : null;
  }
  addHomeUISourceCode(uiSourceCode, breakpoint) {
    let breakpoints = this.#breakpointsForHomeUISourceCode.get(uiSourceCode);
    if (!breakpoints) {
      breakpoints = /* @__PURE__ */ new Set();
      this.#breakpointsForHomeUISourceCode.set(uiSourceCode, breakpoints);
    }
    breakpoints.add(breakpoint);
  }
  removeHomeUISourceCode(uiSourceCode, breakpoint) {
    const breakpoints = this.#breakpointsForHomeUISourceCode.get(uiSourceCode);
    if (!breakpoints) {
      return;
    }
    breakpoints.delete(breakpoint);
    if (breakpoints.size === 0) {
      this.#breakpointsForHomeUISourceCode.delete(uiSourceCode);
    }
  }
  async possibleBreakpoints(uiSourceCode, textRange) {
    const { pluginManager } = this.debuggerWorkspaceBinding;
    if (pluginManager) {
      const rawLocations = await pluginManager.uiLocationToRawLocations(uiSourceCode, textRange.startLine);
      if (rawLocations) {
        const uiLocations = [];
        for (const rawLocation of rawLocations) {
          const uiLocation = await this.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
          if (uiLocation) {
            uiLocations.push(uiLocation);
          }
        }
        return uiLocations;
      }
    }
    const startLocationsPromise = this.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, textRange.startLine, textRange.startColumn);
    const endLocationsPromise = DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(uiSourceCode, textRange.endLine, textRange.endColumn);
    const [startLocations, endLocations] = await Promise.all([startLocationsPromise, endLocationsPromise]);
    const endLocationByModel = /* @__PURE__ */ new Map();
    for (const location of endLocations) {
      endLocationByModel.set(location.debuggerModel, location);
    }
    let startLocation = null;
    let endLocation = null;
    for (const location of startLocations) {
      const endLocationCandidate = endLocationByModel.get(location.debuggerModel);
      if (endLocationCandidate) {
        startLocation = location;
        endLocation = endLocationCandidate;
        break;
      }
    }
    if (!startLocation || !endLocation) {
      return [];
    }
    return startLocation.debuggerModel.getPossibleBreakpoints(startLocation, endLocation, false).then(toUILocations.bind(this));
    async function toUILocations(locations) {
      const sortedLocationsPromises = locations.map((location) => this.debuggerWorkspaceBinding.rawLocationToUILocation(location));
      const nullableLocations = await Promise.all(sortedLocationsPromises);
      const sortedLocations = nullableLocations.filter((location) => location && location.uiSourceCode === uiSourceCode);
      if (!sortedLocations.length) {
        return [];
      }
      sortedLocations.sort(Workspace.UISourceCode.UILocation.comparator);
      let lastLocation = sortedLocations[0];
      const result = [lastLocation];
      for (const location of sortedLocations) {
        if (location.id() !== lastLocation.id()) {
          result.push(location);
          lastLocation = location;
        }
      }
      return result;
    }
  }
  breakpointLocationsForUISourceCode(uiSourceCode) {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiSourceCode);
    return breakpoints ? Array.from(breakpoints.values()) : [];
  }
  #getAllBreakpointsForUISourceCode(uiSourceCode) {
    const uiBreakpoints = this.breakpointLocationsForUISourceCode(uiSourceCode).map((b) => b.breakpoint);
    return uiBreakpoints.concat(Array.from(this.#breakpointsForHomeUISourceCode.get(uiSourceCode) ?? []));
  }
  allBreakpointLocations() {
    const result = [];
    for (const breakpoints of this.#breakpointsForUISourceCode.values()) {
      result.push(...breakpoints.values());
    }
    return result;
  }
  removeBreakpoint(breakpoint, removeFromStorage) {
    if (removeFromStorage) {
      this.storage.removeBreakpoint(breakpoint);
    }
    this.#breakpointByStorageId.delete(breakpoint.breakpointStorageId());
  }
  uiLocationAdded(breakpoint, uiLocation) {
    let breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      breakpoints = /* @__PURE__ */ new Map();
      this.#breakpointsForUISourceCode.set(uiLocation.uiSourceCode, breakpoints);
    }
    const breakpointLocation = new BreakpointLocation(breakpoint, uiLocation);
    breakpoints.set(uiLocation.id(), breakpointLocation);
    this.dispatchEventToListeners(Events.BreakpointAdded, breakpointLocation);
  }
  uiLocationRemoved(breakpoint, uiLocation) {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      return;
    }
    const breakpointLocation = breakpoints.get(uiLocation.id()) || null;
    if (!breakpointLocation) {
      return;
    }
    breakpoints.delete(uiLocation.id());
    if (breakpoints.size === 0) {
      this.#breakpointsForUISourceCode.delete(uiLocation.uiSourceCode);
    }
    this.dispatchEventToListeners(Events.BreakpointRemoved, breakpointLocation);
  }
  supportsConditionalBreakpoints(uiSourceCode) {
    return this.debuggerWorkspaceBinding.supportsConditionalBreakpoints(uiSourceCode);
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["BreakpointAdded"] = "breakpoint-added";
  Events2["BreakpointRemoved"] = "breakpoint-removed";
  return Events2;
})(Events || {});
export var DebuggerUpdateResult = /* @__PURE__ */ ((DebuggerUpdateResult2) => {
  DebuggerUpdateResult2["OK"] = "OK";
  DebuggerUpdateResult2["ERROR_BREAKPOINT_CLASH"] = "ERROR_BREAKPOINT_CLASH";
  DebuggerUpdateResult2["ERROR_BACKEND"] = "ERROR_BACKEND";
  DebuggerUpdateResult2["PENDING"] = "PENDING";
  return DebuggerUpdateResult2;
})(DebuggerUpdateResult || {});
var ResolveLocationResult = /* @__PURE__ */ ((ResolveLocationResult2) => {
  ResolveLocationResult2["OK"] = "OK";
  ResolveLocationResult2["ERROR"] = "ERROR";
  return ResolveLocationResult2;
})(ResolveLocationResult || {});
export class Breakpoint {
  breakpointManager;
  urlInternal;
  #lineNumberInternal;
  #columnNumberInternal;
  #uiLocations;
  uiSourceCodes;
  #conditionInternal;
  #enabledInternal;
  #origin;
  isRemoved = false;
  currentState;
  #modelBreakpoints;
  constructor(breakpointManager, primaryUISourceCode, url, lineNumber, columnNumber, condition, enabled, origin) {
    this.breakpointManager = breakpointManager;
    this.urlInternal = url;
    this.#lineNumberInternal = lineNumber;
    this.#columnNumberInternal = columnNumber;
    this.#origin = origin;
    this.#uiLocations = /* @__PURE__ */ new Set();
    this.uiSourceCodes = /* @__PURE__ */ new Set();
    this.currentState = null;
    this.#modelBreakpoints = /* @__PURE__ */ new Map();
    this.updateState(condition, enabled);
    this.addUISourceCode(primaryUISourceCode);
    this.breakpointManager.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }
  get origin() {
    return this.#origin;
  }
  async refreshInDebugger() {
    if (!this.isRemoved) {
      const modelBreakpoints = Array.from(this.#modelBreakpoints.values());
      await Promise.all(modelBreakpoints.map(async (modelBreakpoint) => {
        await modelBreakpoint.resetBreakpoint();
        return this.#updateModel(modelBreakpoint);
      }));
    }
  }
  modelAdded(debuggerModel) {
    const debuggerWorkspaceBinding = this.breakpointManager.debuggerWorkspaceBinding;
    const modelBreakpoint = new ModelBreakpoint(debuggerModel, this, debuggerWorkspaceBinding);
    this.#modelBreakpoints.set(debuggerModel, modelBreakpoint);
    void this.#updateModel(modelBreakpoint);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#onDebuggerEnabled, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerWasDisabled, this.#onDebuggerDisabled, this);
  }
  modelRemoved(debuggerModel) {
    const modelBreakpoint = this.#modelBreakpoints.get(debuggerModel);
    modelBreakpoint?.cleanUpAfterDebuggerIsGone();
    this.#modelBreakpoints.delete(debuggerModel);
    this.#removeDebuggerModelListeners(debuggerModel);
  }
  #removeDebuggerModelListeners(debuggerModel) {
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#onDebuggerEnabled, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerWasDisabled, this.#onDebuggerDisabled, this);
  }
  #onDebuggerEnabled(event) {
    const debuggerModel = event.data;
    const model = this.#modelBreakpoints.get(debuggerModel);
    if (model) {
      void this.#updateModel(model);
    }
  }
  #onDebuggerDisabled(event) {
    const debuggerModel = event.data;
    const model = this.#modelBreakpoints.get(debuggerModel);
    model?.cleanUpAfterDebuggerIsGone();
  }
  modelBreakpoint(debuggerModel) {
    return this.#modelBreakpoints.get(debuggerModel);
  }
  addUISourceCode(uiSourceCode) {
    if (!this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.add(uiSourceCode);
      this.breakpointManager.addHomeUISourceCode(uiSourceCode, this);
      if (!this.bound()) {
        this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
      }
    }
  }
  clearUISourceCodes() {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
    }
    for (const uiSourceCode of this.uiSourceCodes) {
      this.removeUISourceCode(uiSourceCode);
    }
  }
  removeUISourceCode(uiSourceCode) {
    if (this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.delete(uiSourceCode);
      this.breakpointManager.removeHomeUISourceCode(uiSourceCode, this);
      if (!this.bound()) {
        this.breakpointManager.uiLocationRemoved(this, this.defaultUILocation(uiSourceCode));
      }
    }
    if (this.bound()) {
      for (const uiLocation of this.#uiLocations) {
        if (uiLocation.uiSourceCode === uiSourceCode) {
          this.#uiLocations.delete(uiLocation);
          this.breakpointManager.uiLocationRemoved(this, uiLocation);
        }
      }
      if (!this.bound() && !this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
  }
  url() {
    return this.urlInternal;
  }
  lineNumber() {
    return this.#lineNumberInternal;
  }
  columnNumber() {
    return this.#columnNumberInternal;
  }
  uiLocationAdded(uiLocation) {
    if (this.isRemoved) {
      return;
    }
    if (!this.bound()) {
      this.removeAllUnboundLocations();
    }
    this.#uiLocations.add(uiLocation);
    this.breakpointManager.uiLocationAdded(this, uiLocation);
  }
  uiLocationRemoved(uiLocation) {
    if (this.#uiLocations.has(uiLocation)) {
      this.#uiLocations.delete(uiLocation);
      this.breakpointManager.uiLocationRemoved(this, uiLocation);
      if (!this.bound() && !this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
  }
  enabled() {
    return this.#enabledInternal;
  }
  bound() {
    return this.#uiLocations.size !== 0;
  }
  hasBoundScript() {
    for (const uiSourceCode of this.uiSourceCodes) {
      if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
        return true;
      }
    }
    return false;
  }
  setEnabled(enabled) {
    this.updateState(this.#conditionInternal, enabled);
  }
  condition() {
    return this.#conditionInternal;
  }
  setCondition(condition) {
    this.updateState(condition, this.#enabledInternal);
  }
  updateState(condition, enabled) {
    if (this.#enabledInternal === enabled && this.#conditionInternal === condition) {
      return;
    }
    this.#enabledInternal = enabled;
    this.#conditionInternal = condition;
    this.breakpointManager.storage.updateBreakpoint(this);
    void this.updateBreakpoint();
  }
  async updateBreakpoint() {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
      if (!this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
    return this.#updateModels();
  }
  async remove(keepInStorage) {
    if (this.getIsRemoved()) {
      return;
    }
    this.isRemoved = true;
    const removeFromStorage = !keepInStorage;
    for (const debuggerModel of this.#modelBreakpoints.keys()) {
      this.#removeDebuggerModelListeners(debuggerModel);
    }
    await this.#updateModels();
    this.breakpointManager.removeBreakpoint(this, removeFromStorage);
    this.breakpointManager.targetManager.unobserveModels(SDK.DebuggerModel.DebuggerModel, this);
    this.clearUISourceCodes();
  }
  breakpointStorageId() {
    return BreakpointManager.breakpointStorageId(this.urlInternal, this.#lineNumberInternal, this.#columnNumberInternal);
  }
  defaultUILocation(uiSourceCode) {
    return BreakpointManager.uiLocationFromBreakpointLocation(uiSourceCode, this.#lineNumberInternal, this.#columnNumberInternal);
  }
  removeAllUnboundLocations() {
    for (const uiSourceCode of this.uiSourceCodes) {
      this.breakpointManager.uiLocationRemoved(this, this.defaultUILocation(uiSourceCode));
    }
  }
  addAllUnboundLocations() {
    for (const uiSourceCode of this.uiSourceCodes) {
      this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
    }
  }
  getUiSourceCodes() {
    return this.uiSourceCodes;
  }
  getIsRemoved() {
    return this.isRemoved;
  }
  async #updateModels() {
    await Promise.all(Array.from(this.#modelBreakpoints.values()).map((model) => this.#updateModel(model)));
  }
  async #updateModel(model) {
    const result = await model.scheduleUpdateInDebugger();
    if (result === "ERROR_BACKEND" /* ERROR_BACKEND */) {
      await this.remove(true);
    } else if (result === "ERROR_BREAKPOINT_CLASH" /* ERROR_BREAKPOINT_CLASH */) {
      await this.remove(false);
    }
  }
}
export class ModelBreakpoint {
  #debuggerModel;
  #breakpoint;
  #debuggerWorkspaceBinding;
  #liveLocations;
  #uiLocations;
  #updateMutex = new Common.Mutex.Mutex();
  #cancelCallback;
  #currentState;
  #breakpointIds;
  constructor(debuggerModel, breakpoint, debuggerWorkspaceBinding) {
    this.#debuggerModel = debuggerModel;
    this.#breakpoint = breakpoint;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#liveLocations = new LiveLocationPool();
    this.#uiLocations = /* @__PURE__ */ new Map();
    this.#cancelCallback = false;
    this.#currentState = null;
    this.#breakpointIds = [];
  }
  get currentState() {
    return this.#currentState;
  }
  resetLocations() {
    for (const uiLocation of this.#uiLocations.values()) {
      this.#breakpoint.uiLocationRemoved(uiLocation);
    }
    this.#uiLocations.clear();
    this.#liveLocations.disposeAll();
  }
  async scheduleUpdateInDebugger() {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return "OK" /* OK */;
    }
    const release = await this.#updateMutex.acquire();
    let result = "PENDING" /* PENDING */;
    while (result === "PENDING" /* PENDING */) {
      result = await this.#updateInDebugger();
    }
    release();
    return result;
  }
  scriptDiverged() {
    for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
      const scriptFile = this.#debuggerWorkspaceBinding.scriptFile(uiSourceCode, this.#debuggerModel);
      if (scriptFile && scriptFile.hasDivergedFromVM()) {
        return true;
      }
    }
    return false;
  }
  async #updateInDebugger() {
    if (this.#debuggerModel.target().isDisposed()) {
      this.cleanUpAfterDebuggerIsGone();
      return "OK" /* OK */;
    }
    const lineNumber = this.#breakpoint.lineNumber();
    const columnNumber = this.#breakpoint.columnNumber();
    const condition = this.#breakpoint.condition();
    let newState = null;
    if (!this.#breakpoint.getIsRemoved() && this.#breakpoint.enabled() && !this.scriptDiverged()) {
      let debuggerLocations = [];
      for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
        const { lineNumber: uiLineNumber, columnNumber: uiColumnNumber } = BreakpointManager.uiLocationFromBreakpointLocation(uiSourceCode, lineNumber, columnNumber);
        const locations2 = await DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(uiSourceCode, uiLineNumber, uiColumnNumber);
        debuggerLocations = locations2.filter((location) => location.debuggerModel === this.#debuggerModel);
        if (debuggerLocations.length) {
          break;
        }
      }
      if (debuggerLocations.length && debuggerLocations.every((loc) => loc.script())) {
        const positions = debuggerLocations.map((loc) => {
          const script = loc.script();
          return {
            url: script.sourceURL,
            scriptHash: script.hash,
            lineNumber: loc.lineNumber,
            columnNumber: loc.columnNumber
          };
        });
        newState = new Breakpoint.State(positions, condition);
      } else if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS)) {
        if (this.#breakpoint.currentState) {
          newState = new Breakpoint.State(this.#breakpoint.currentState.positions, condition);
        } else {
          const position = {
            url: this.#breakpoint.url(),
            scriptHash: "",
            lineNumber,
            columnNumber
          };
          newState = new Breakpoint.State([position], condition);
        }
      }
    }
    const hasBackendState = this.#breakpointIds.length;
    if (hasBackendState && Breakpoint.State.equals(newState, this.#currentState)) {
      return "OK" /* OK */;
    }
    this.#breakpoint.currentState = newState;
    if (hasBackendState) {
      await this.resetBreakpoint();
      return "PENDING" /* PENDING */;
    }
    if (!newState) {
      return "OK" /* OK */;
    }
    const { breakpointIds, locations, serverError } = await this.#setBreakpointOnBackend(newState);
    const maybeRescheduleUpdate = serverError && this.#debuggerModel.debuggerEnabled() && !this.#debuggerModel.isReadyToPause();
    if (!breakpointIds.length && maybeRescheduleUpdate) {
      return "PENDING" /* PENDING */;
    }
    this.#currentState = newState;
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return "OK" /* OK */;
    }
    if (!breakpointIds.length) {
      return "ERROR_BACKEND" /* ERROR_BACKEND */;
    }
    this.#breakpointIds = breakpointIds;
    this.#breakpointIds.forEach((breakpointId) => this.#debuggerModel.addBreakpointListener(breakpointId, this.breakpointResolved, this));
    const resolvedResults = await Promise.all(locations.map((location) => this.addResolvedLocation(location)));
    if (resolvedResults.includes("ERROR" /* ERROR */)) {
      return "ERROR_BREAKPOINT_CLASH" /* ERROR_BREAKPOINT_CLASH */;
    }
    return "OK" /* OK */;
  }
  async #setBreakpointOnBackend(newState) {
    const condition = this.#breakpoint.condition();
    const results = await Promise.all(newState.positions.map((pos) => {
      if (pos.url) {
        return this.#debuggerModel.setBreakpointByURL(pos.url, pos.lineNumber, pos.columnNumber, condition);
      }
      return this.#debuggerModel.setBreakpointInAnonymousScript(pos.scriptHash, pos.lineNumber, pos.columnNumber, condition);
    }));
    const breakpointIds = [];
    let locations = [];
    let serverError = false;
    for (const result of results) {
      if (result.breakpointId) {
        breakpointIds.push(result.breakpointId);
        locations = locations.concat(result.locations);
      } else {
        serverError = true;
      }
    }
    return { breakpointIds, locations, serverError };
  }
  async resetBreakpoint() {
    if (!this.#breakpointIds.length) {
      return;
    }
    this.resetLocations();
    await Promise.all(this.#breakpointIds.map((id) => this.#debuggerModel.removeBreakpoint(id)));
    this.didRemoveFromDebugger();
    this.#currentState = null;
  }
  didRemoveFromDebugger() {
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return;
    }
    this.resetLocations();
    this.#breakpointIds.forEach((breakpointId) => this.#debuggerModel.removeBreakpointListener(breakpointId, this.breakpointResolved, this));
    this.#breakpointIds = [];
  }
  async breakpointResolved({ data: location }) {
    const result = await this.addResolvedLocation(location);
    if (result === "ERROR" /* ERROR */) {
      await this.#breakpoint.remove(false);
    }
  }
  async locationUpdated(liveLocation) {
    const oldUILocation = this.#uiLocations.get(liveLocation);
    const uiLocation = await liveLocation.uiLocation();
    if (oldUILocation) {
      this.#breakpoint.uiLocationRemoved(oldUILocation);
    }
    if (uiLocation) {
      this.#uiLocations.set(liveLocation, uiLocation);
      this.#breakpoint.uiLocationAdded(uiLocation);
    } else {
      this.#uiLocations.delete(liveLocation);
    }
  }
  async addResolvedLocation(location) {
    const uiLocation = await this.#debuggerWorkspaceBinding.rawLocationToUILocation(location);
    if (!uiLocation) {
      return "OK" /* OK */;
    }
    const breakpointLocation = this.#breakpoint.breakpointManager.findBreakpoint(uiLocation);
    if (breakpointLocation && breakpointLocation.breakpoint !== this.#breakpoint) {
      return "ERROR" /* ERROR */;
    }
    await this.#debuggerWorkspaceBinding.createLiveLocation(location, this.locationUpdated.bind(this), this.#liveLocations);
    return "OK" /* OK */;
  }
  cleanUpAfterDebuggerIsGone() {
    this.#cancelCallback = true;
    this.resetLocations();
    this.#currentState = null;
    if (this.#breakpointIds.length) {
      this.didRemoveFromDebugger();
    }
  }
}
export var BreakpointOrigin = /* @__PURE__ */ ((BreakpointOrigin2) => {
  BreakpointOrigin2["USER_ACTION"] = "USER_ACTION";
  BreakpointOrigin2["OTHER"] = "RESTORED";
  return BreakpointOrigin2;
})(BreakpointOrigin || {});
((Breakpoint2) => {
  class State {
    positions;
    condition;
    constructor(positions, condition) {
      this.positions = positions;
      this.condition = condition;
    }
    static equals(stateA, stateB) {
      if (!stateA || !stateB) {
        return false;
      }
      if (stateA.condition !== stateB.condition) {
        return false;
      }
      if (stateA.positions.length !== stateB.positions.length) {
        return false;
      }
      for (let i = 0; i < stateA.positions.length; i++) {
        const positionA = stateA.positions[i];
        const positionB = stateB.positions[i];
        if (positionA.url !== positionB.url) {
          return false;
        }
        if (positionA.scriptHash !== positionB.scriptHash) {
          return false;
        }
        if (positionA.lineNumber !== positionB.lineNumber) {
          return false;
        }
        if (positionA.columnNumber !== positionB.columnNumber) {
          return false;
        }
      }
      return true;
    }
  }
  Breakpoint2.State = State;
})(Breakpoint || (Breakpoint = {}));
class Storage {
  #setting;
  #breakpoints;
  #muted;
  constructor() {
    this.#setting = Common.Settings.Settings.instance().createLocalSetting("breakpoints", []);
    this.#breakpoints = /* @__PURE__ */ new Map();
    const items = this.#setting.get();
    for (const item of items) {
      this.#breakpoints.set(BreakpointManager.breakpointStorageId(item.url, item.lineNumber, item.columnNumber), item);
    }
  }
  get setting() {
    return this.#setting;
  }
  mute() {
    this.#muted = true;
  }
  unmute() {
    this.#muted = void 0;
  }
  breakpointItems(url) {
    return Array.from(this.#breakpoints.values()).filter((item) => item.url === url);
  }
  updateBreakpoint(breakpoint) {
    if (this.#muted || !breakpoint.breakpointStorageId()) {
      return;
    }
    this.#breakpoints.set(breakpoint.breakpointStorageId(), new Storage.Item(breakpoint));
    this.save();
  }
  removeBreakpoint(breakpoint) {
    if (!this.#muted) {
      this.#breakpoints.delete(breakpoint.breakpointStorageId());
      this.save();
    }
  }
  save() {
    this.#setting.set(Array.from(this.#breakpoints.values()));
  }
}
((Storage2) => {
  class Item {
    url;
    lineNumber;
    columnNumber;
    condition;
    enabled;
    constructor(breakpoint) {
      this.url = breakpoint.url();
      this.lineNumber = breakpoint.lineNumber();
      this.columnNumber = breakpoint.columnNumber();
      this.condition = breakpoint.condition();
      this.enabled = breakpoint.enabled();
    }
  }
  Storage2.Item = Item;
})(Storage || (Storage = {}));
export class BreakpointLocation {
  breakpoint;
  uiLocation;
  constructor(breakpoint, uiLocation) {
    this.breakpoint = breakpoint;
    this.uiLocation = uiLocation;
  }
}
//# sourceMappingURL=BreakpointManager.js.map
