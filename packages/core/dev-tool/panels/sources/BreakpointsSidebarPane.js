import * as Common from "../../core/common/common.js";
import * as Platform from "../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "../../core/platform/platform.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as Bindings from "../../models/bindings/bindings.js";
import * as TextUtils from "../../models/text_utils/text_utils.js";
import * as Workspace from "../../models/workspace/workspace.js";
import * as UI from "../../ui/legacy/legacy.js";
import { LogpointPrefix, LogpointSuffix } from "./BreakpointEditDialog.js";
import * as SourcesComponents from "./components/components.js";
let breakpointsSidebarPaneInstance;
let breakpointsViewControllerInstance;
export class BreakpointsSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  #breakpointsView;
  #controller;
  static instance() {
    if (!breakpointsSidebarPaneInstance) {
      breakpointsSidebarPaneInstance = new BreakpointsSidebarPane();
    }
    return breakpointsSidebarPaneInstance;
  }
  constructor() {
    super(true);
    this.#controller = BreakpointsSidebarController.instance();
    this.#breakpointsView = new SourcesComponents.BreakpointsView.BreakpointsView();
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.CheckboxToggledEvent.eventName, (event) => {
      const { data: { breakpointItem, checked } } = event;
      this.#controller.breakpointStateChanged(breakpointItem, checked);
      event.consume();
    });
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.BreakpointSelectedEvent.eventName, (event) => {
      const { data: { breakpointItem } } = event;
      void this.#controller.jumpToSource(breakpointItem);
      event.consume();
    });
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.BreakpointEditedEvent.eventName, (event) => {
      const { data: { breakpointItem } } = event;
      void this.#controller.breakpointEdited(breakpointItem);
      event.consume();
    });
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.BreakpointsRemovedEvent.eventName, (event) => {
      const { data: { breakpointItems } } = event;
      void this.#controller.breakpointsRemoved(breakpointItems);
      event.consume();
    });
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.ExpandedStateChangedEvent.eventName, (event) => {
      const { data: { url, expanded } } = event;
      void this.#controller.expandedStateChanged(url, expanded);
      event.consume();
    });
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.PauseOnUncaughtExceptionsStateChangedEvent.eventName, (event) => {
      const { data: { checked } } = event;
      this.#controller.setPauseOnUncaughtExceptions(checked);
      event.consume();
    });
    this.#breakpointsView.addEventListener(SourcesComponents.BreakpointsView.PauseOnCaughtExceptionsStateChangedEvent.eventName, (event) => {
      const { data: { checked } } = event;
      this.#controller.setPauseOnCaughtExceptions(checked);
      event.consume();
    });
    this.contentElement.appendChild(this.#breakpointsView);
    this.update();
  }
  doUpdate() {
    return this.#controller.update();
  }
  set data(data) {
    this.#breakpointsView.data = data;
  }
}
export class BreakpointsSidebarController {
  #breakpointManager;
  #breakpointItemToLocationMap = /* @__PURE__ */ new WeakMap();
  #breakpointsActiveSetting;
  #pauseOnUncaughtExceptionSetting;
  #pauseOnCaughtExceptionSetting;
  #collapsedFilesSettings;
  #collapsedFiles;
  #updateScheduled = false;
  #updateRunning = false;
  constructor(breakpointManager, settings) {
    this.#collapsedFilesSettings = Common.Settings.Settings.instance().createSetting("collapsedFiles", []);
    this.#collapsedFiles = new Set(this.#collapsedFilesSettings.get());
    this.#breakpointManager = breakpointManager;
    this.#breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded, this.#onBreakpointAdded, this);
    this.#breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved, this.#onBreakpointRemoved, this);
    this.#breakpointsActiveSetting = settings.moduleSetting("breakpointsActive");
    this.#breakpointsActiveSetting.addChangeListener(this.update, this);
    this.#pauseOnUncaughtExceptionSetting = settings.moduleSetting("pauseOnUncaughtException");
    this.#pauseOnUncaughtExceptionSetting.addChangeListener(this.update, this);
    this.#pauseOnCaughtExceptionSetting = settings.moduleSetting("pauseOnCaughtException");
    this.#pauseOnCaughtExceptionSetting.addChangeListener(this.update, this);
  }
  static instance({ forceNew, breakpointManager, settings } = {
    forceNew: null,
    breakpointManager: Bindings.BreakpointManager.BreakpointManager.instance(),
    settings: Common.Settings.Settings.instance()
  }) {
    if (!breakpointsViewControllerInstance || forceNew) {
      breakpointsViewControllerInstance = new BreakpointsSidebarController(breakpointManager, settings);
    }
    return breakpointsViewControllerInstance;
  }
  static removeInstance() {
    breakpointsViewControllerInstance = null;
  }
  static targetSupportsIndependentPauseOnExceptionToggles() {
    const hasNodeTargets = SDK.TargetManager.TargetManager.instance().targets().some((target) => target.type() === SDK.Target.Type.Node);
    return !hasNodeTargets;
  }
  flavorChanged(_object) {
    void this.update();
  }
  breakpointStateChanged(breakpointItem, checked) {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    locations.forEach((value) => {
      const breakpoint = value.breakpoint;
      breakpoint.setEnabled(checked);
    });
  }
  async breakpointEdited(breakpointItem) {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    let location;
    for (const locationCandidate of locations) {
      if (!location || locationCandidate.uiLocation.compareTo(location.uiLocation) < 0) {
        location = locationCandidate;
      }
    }
    if (location) {
      await Common.Revealer.reveal(location);
    }
  }
  breakpointsRemoved(breakpointItems) {
    const locations = breakpointItems.flatMap((breakpointItem) => this.#getLocationsForBreakpointItem(breakpointItem));
    locations.forEach((location) => location?.breakpoint.remove(false));
  }
  expandedStateChanged(url, expanded) {
    if (expanded) {
      this.#collapsedFiles.delete(url);
    } else {
      this.#collapsedFiles.add(url);
    }
    this.#saveSettings();
  }
  async jumpToSource(breakpointItem) {
    const uiLocations = this.#getLocationsForBreakpointItem(breakpointItem).map((location) => location.uiLocation);
    let uiLocation;
    for (const uiLocationCandidate of uiLocations) {
      if (!uiLocation || uiLocationCandidate.compareTo(uiLocation) < 0) {
        uiLocation = uiLocationCandidate;
      }
    }
    if (uiLocation) {
      await Common.Revealer.reveal(uiLocation);
    }
  }
  setPauseOnUncaughtExceptions(value) {
    this.#pauseOnUncaughtExceptionSetting.set(value);
  }
  setPauseOnCaughtExceptions(value) {
    this.#pauseOnCaughtExceptionSetting.set(value);
  }
  async update() {
    this.#updateScheduled = true;
    if (this.#updateRunning) {
      return;
    }
    this.#updateRunning = true;
    while (this.#updateScheduled) {
      this.#updateScheduled = false;
      const data = await this.getUpdatedBreakpointViewData();
      BreakpointsSidebarPane.instance().data = data;
    }
    this.#updateRunning = false;
  }
  async getUpdatedBreakpointViewData() {
    const breakpointsActive = this.#breakpointsActiveSetting.get();
    const independentPauseToggles = BreakpointsSidebarController.targetSupportsIndependentPauseOnExceptionToggles();
    const pauseOnUncaughtExceptions = this.#pauseOnUncaughtExceptionSetting.get();
    const pauseOnCaughtExceptions = this.#pauseOnCaughtExceptionSetting.get();
    const breakpointLocations = this.#getBreakpointLocations();
    if (!breakpointLocations.length) {
      return {
        breakpointsActive,
        pauseOnCaughtExceptions,
        pauseOnUncaughtExceptions,
        independentPauseToggles,
        groups: []
      };
    }
    const locationsGroupedById = this.#groupBreakpointLocationsById(breakpointLocations);
    const locationIdsByLineId = this.#getLocationIdsByLineId(breakpointLocations);
    const [content, selectedUILocation] = await Promise.all([
      this.#getContent(locationsGroupedById),
      this.#getHitUILocation()
    ]);
    const urlToGroup = /* @__PURE__ */ new Map();
    for (let idx = 0; idx < locationsGroupedById.length; idx++) {
      const locations = locationsGroupedById[idx];
      const fstLocation = locations[0];
      const sourceURL = fstLocation.uiLocation.uiSourceCode.url();
      const uiLocation = fstLocation.uiLocation;
      const isHit = selectedUILocation !== null && locations.some((location) => location.uiLocation.id() === selectedUILocation.id());
      const numBreakpointsOnLine = locationIdsByLineId.get(uiLocation.lineId()).size;
      const showColumn = numBreakpointsOnLine > 1;
      const locationText = uiLocation.lineAndColumnText(showColumn);
      const text = content[idx];
      const codeSnippet = text.lineAt(uiLocation.lineNumber);
      if (isHit && this.#collapsedFiles.has(sourceURL)) {
        this.#collapsedFiles.delete(sourceURL);
        this.#saveSettings();
      }
      const expanded = !this.#collapsedFiles.has(sourceURL);
      const status = this.#getBreakpointState(locations);
      const { type, hoverText } = this.#getBreakpointTypeAndDetails(locations);
      const item = {
        id: fstLocation.breakpoint.breakpointStorageId(),
        location: locationText,
        codeSnippet,
        isHit,
        status,
        type,
        hoverText
      };
      this.#breakpointItemToLocationMap.set(item, locations);
      let group = urlToGroup.get(sourceURL);
      if (group) {
        group.breakpointItems.push(item);
        group.expanded ||= expanded;
      } else {
        const editable = this.#breakpointManager.supportsConditionalBreakpoints(uiLocation.uiSourceCode);
        group = {
          url: sourceURL,
          name: uiLocation.uiSourceCode.displayName(),
          editable,
          expanded,
          breakpointItems: [item]
        };
        urlToGroup.set(sourceURL, group);
      }
    }
    return {
      breakpointsActive,
      pauseOnCaughtExceptions,
      pauseOnUncaughtExceptions,
      independentPauseToggles,
      groups: Array.from(urlToGroup.values())
    };
  }
  #onBreakpointAdded(event) {
    const breakpoint = event.data.breakpoint;
    if (breakpoint.origin === Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION && this.#collapsedFiles.has(breakpoint.url())) {
      this.#collapsedFiles.delete(breakpoint.url());
      this.#saveSettings();
    }
    return this.update();
  }
  #onBreakpointRemoved(event) {
    const breakpoint = event.data.breakpoint;
    if (this.#collapsedFiles.has(breakpoint.url())) {
      const locations = Bindings.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
      const otherBreakpointsOnSameFileExist = locations.some((location) => location.breakpoint.url() === breakpoint.url());
      if (!otherBreakpointsOnSameFileExist) {
        this.#collapsedFiles.delete(breakpoint.url());
        this.#saveSettings();
      }
    }
    return this.update();
  }
  #saveSettings() {
    this.#collapsedFilesSettings.set(Array.from(this.#collapsedFiles.values()));
  }
  #getBreakpointTypeAndDetails(locations) {
    const breakpointWithCondition = locations.find((location) => Boolean(location.breakpoint.condition()));
    let hoverText = breakpointWithCondition?.breakpoint.condition();
    let type = SourcesComponents.BreakpointsView.BreakpointType.REGULAR_BREAKPOINT;
    if (breakpointWithCondition && hoverText) {
      if (hoverText.startsWith(LogpointPrefix) && hoverText.endsWith(LogpointSuffix)) {
        type = SourcesComponents.BreakpointsView.BreakpointType.LOGPOINT;
        hoverText = hoverText.slice(LogpointPrefix.length, hoverText.length - LogpointSuffix.length);
      } else {
        type = SourcesComponents.BreakpointsView.BreakpointType.CONDITIONAL_BREAKPOINT;
      }
    }
    return { type, hoverText };
  }
  #getLocationsForBreakpointItem(breakpointItem) {
    const locations = this.#breakpointItemToLocationMap.get(breakpointItem);
    assertNotNullOrUndefined(locations);
    return locations;
  }
  async #getHitUILocation() {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (details && details.callFrames.length) {
      return await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(details.callFrames[0].location());
    }
    return null;
  }
  #getBreakpointLocations() {
    const locations = this.#breakpointManager.allBreakpointLocations().filter((breakpointLocation) => breakpointLocation.uiLocation.uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Debugger);
    locations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));
    const result = [];
    let lastBreakpoint = null;
    let lastLocation = null;
    for (const location of locations) {
      if (location.breakpoint !== lastBreakpoint || lastLocation && location.uiLocation.compareTo(lastLocation)) {
        result.push(location);
        lastBreakpoint = location.breakpoint;
        lastLocation = location.uiLocation;
      }
    }
    return result;
  }
  #groupBreakpointLocationsById(breakpointLocations) {
    const map = new Platform.MapUtilities.Multimap();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      map.set(uiLocation.id(), breakpointLocation);
    }
    const arr = [];
    for (const id of map.keysArray()) {
      const locations = Array.from(map.get(id));
      if (locations.length) {
        arr.push(locations);
      }
    }
    return arr;
  }
  #getLocationIdsByLineId(breakpointLocations) {
    const result = new Platform.MapUtilities.Multimap();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      result.set(uiLocation.lineId(), uiLocation.id());
    }
    return result;
  }
  #getBreakpointState(locations) {
    const hasEnabled = locations.some((location) => location.breakpoint.enabled());
    const hasDisabled = locations.some((location) => !location.breakpoint.enabled());
    let status;
    if (hasEnabled) {
      status = hasDisabled ? SourcesComponents.BreakpointsView.BreakpointStatus.INDETERMINATE : SourcesComponents.BreakpointsView.BreakpointStatus.ENABLED;
    } else {
      status = SourcesComponents.BreakpointsView.BreakpointStatus.DISABLED;
    }
    return status;
  }
  #getContent(locations) {
    const contentToTextMap = /* @__PURE__ */ new Map();
    return Promise.all(locations.map(async ([{ uiLocation: { uiSourceCode } }]) => {
      if (uiSourceCode.mimeType() === "application/wasm") {
        return new TextUtils.Text.Text("");
      }
      const { content } = await uiSourceCode.requestContent();
      const contentText = content || "";
      if (contentToTextMap.has(contentText)) {
        return contentToTextMap.get(contentText);
      }
      const text = new TextUtils.Text.Text(contentText);
      contentToTextMap.set(contentText, text);
      return text;
    }));
  }
}
//# sourceMappingURL=BreakpointsSidebarPane.js.map
