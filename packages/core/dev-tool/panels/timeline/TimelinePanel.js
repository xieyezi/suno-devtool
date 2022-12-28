import * as Common from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as Platform from "../../core/platform/platform.js";
import * as Root from "../../core/root/root.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as Bindings from "../../models/bindings/bindings.js";
import * as Extensions from "../../models/extensions/extensions.js";
import * as TimelineModel from "../../models/timeline_model/timeline_model.js";
import * as PerfUI from "../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI from "../../ui/legacy/legacy.js";
import historyToolbarButtonStyles from "./historyToolbarButton.css.js";
import timelinePanelStyles from "./timelinePanel.css.js";
import timelineStatusDialogStyles from "./timelineStatusDialog.css.js";
import * as MobileThrottling from "../mobile_throttling/mobile_throttling.js";
import { Events, PerformanceModel } from "./PerformanceModel.js";
import { TimelineController } from "./TimelineController.js";
import {
  TimelineEventOverviewCoverage,
  TimelineEventOverviewCPUActivity,
  TimelineEventOverviewInput,
  TimelineEventOverviewMemory,
  TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness,
  TimelineFilmStripOverview
} from "./TimelineEventOverview.js";
import { TimelineFlameChartView } from "./TimelineFlameChartView.js";
import { TimelineHistoryManager } from "./TimelineHistoryManager.js";
import { TimelineLoader } from "./TimelineLoader.js";
import { TimelineUIUtils } from "./TimelineUIUtils.js";
import { UIDevtoolsController } from "./UIDevtoolsController.js";
import { UIDevtoolsUtils } from "./UIDevtoolsUtils.js";
const UIStrings = {
  dropTimelineFileOrUrlHere: "Drop timeline file or URL here",
  disableJavascriptSamples: "Disable JavaScript samples",
  enableAdvancedPaint: "Enable advanced paint instrumentation (slow)",
  screenshots: "Screenshots",
  coverage: "Coverage",
  memory: "Memory",
  webVitals: "Web Vitals",
  clear: "Clear",
  loadProfile: "Load profile\u2026",
  saveProfile: "Save profile\u2026",
  captureScreenshots: "Capture screenshots",
  showMemoryTimeline: "Show memory timeline",
  showWebVitals: "Show Web Vitals",
  recordCoverageWithPerformance: "Record coverage with performance trace",
  captureSettings: "Capture settings",
  disablesJavascriptSampling: "Disables JavaScript sampling, reduces overhead when running against mobile devices",
  capturesAdvancedPaint: "Captures advanced paint instrumentation, introduces significant performance overhead",
  network: "Network:",
  cpu: "CPU:",
  networkConditions: "Network conditions",
  failedToSaveTimelineSSS: "Failed to save timeline: {PH1} ({PH2}, {PH3})",
  CpuThrottlingIsEnabled: "- CPU throttling is enabled",
  NetworkThrottlingIsEnabled: "- Network throttling is enabled",
  HardwareConcurrencyIsEnabled: "- Hardware concurrency override is enabled",
  SignificantOverheadDueToPaint: "- Significant overhead due to paint instrumentation",
  JavascriptSamplingIsDisabled: "- JavaScript sampling is disabled",
  stoppingTimeline: "Stopping timeline\u2026",
  received: "Received",
  close: "Close",
  recordingFailed: "Recording failed",
  profiling: "Profiling\u2026",
  bufferUsage: "Buffer usage",
  learnmore: "Learn\xA0more",
  wasd: "WASD",
  clickTheRecordButtonSOrHitSTo: "Click the record button {PH1} or hit {PH2} to start a new recording.",
  clickTheReloadButtonSOrHitSTo: "Click the reload button {PH1} or hit {PH2} to record the page load.",
  afterRecordingSelectAnAreaOf: "After recording, select an area of interest in the overview by dragging. Then, zoom and pan the timeline with the mousewheel or {PH1} keys. {PH2}",
  loadingProfile: "Loading profile\u2026",
  processingProfile: "Processing profile\u2026",
  initializingProfiler: "Initializing profiler\u2026",
  status: "Status",
  time: "Time",
  description: "Description",
  stop: "Stop",
  ssec: "{PH1}\xA0sec"
};
const str_ = i18n.i18n.registerUIStrings("panels/timeline/TimelinePanel.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
let timelinePanelInstance;
let isNode;
export class TimelinePanel extends UI.Panel.Panel {
  dropTarget;
  recordingOptionUIControls;
  state;
  recordingPageReload;
  millisecondsToRecordAfterLoadEvent;
  toggleRecordAction;
  recordReloadAction;
  historyManager;
  performanceModel;
  viewModeSetting;
  disableCaptureJSProfileSetting;
  captureLayersAndPicturesSetting;
  showScreenshotsSetting;
  startCoverage;
  showMemorySetting;
  showWebVitalsSetting;
  panelToolbar;
  panelRightToolbar;
  timelinePane;
  overviewPane;
  overviewControls;
  statusPaneContainer;
  flameChart;
  searchableViewInternal;
  showSettingsPaneButton;
  showSettingsPaneSetting;
  settingsPane;
  controller;
  cpuProfiler;
  clearButton;
  loadButton;
  saveButton;
  statusPane;
  landingPage;
  loader;
  showScreenshotsToolbarCheckbox;
  showMemoryToolbarCheckbox;
  showWebVitalsToolbarCheckbox;
  startCoverageCheckbox;
  networkThrottlingSelect;
  cpuThrottlingSelect;
  fileSelectorElement;
  selection;
  constructor() {
    super("timeline");
    this.element.addEventListener("contextmenu", this.contextMenu.bind(this), false);
    this.dropTarget = new UI.DropTarget.DropTarget(this.element, [UI.DropTarget.Type.File, UI.DropTarget.Type.URI], i18nString(UIStrings.dropTimelineFileOrUrlHere), this.handleDrop.bind(this));
    this.recordingOptionUIControls = [];
    this.state = State.Idle;
    this.recordingPageReload = false;
    this.millisecondsToRecordAfterLoadEvent = 5e3;
    this.toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().action("timeline.toggle-recording");
    this.recordReloadAction = UI.ActionRegistry.ActionRegistry.instance().action("timeline.record-reload");
    this.historyManager = new TimelineHistoryManager();
    this.performanceModel = null;
    this.viewModeSetting = Common.Settings.Settings.instance().createSetting("timelineViewMode", ViewMode.FlameChart);
    this.disableCaptureJSProfileSetting = Common.Settings.Settings.instance().createSetting("timelineDisableJSSampling", false);
    this.disableCaptureJSProfileSetting.setTitle(i18nString(UIStrings.disableJavascriptSamples));
    this.captureLayersAndPicturesSetting = Common.Settings.Settings.instance().createSetting("timelineCaptureLayersAndPictures", false);
    this.captureLayersAndPicturesSetting.setTitle(i18nString(UIStrings.enableAdvancedPaint));
    this.showScreenshotsSetting = Common.Settings.Settings.instance().createSetting("timelineShowScreenshots", isNode ? false : true);
    this.showScreenshotsSetting.setTitle(i18nString(UIStrings.screenshots));
    this.showScreenshotsSetting.addChangeListener(this.updateOverviewControls, this);
    this.startCoverage = Common.Settings.Settings.instance().createSetting("timelineStartCoverage", false);
    this.startCoverage.setTitle(i18nString(UIStrings.coverage));
    if (!Root.Runtime.experiments.isEnabled("recordCoverageWithPerformanceTracing")) {
      this.startCoverage.set(false);
    }
    this.showMemorySetting = Common.Settings.Settings.instance().createSetting("timelineShowMemory", false);
    this.showMemorySetting.setTitle(i18nString(UIStrings.memory));
    this.showMemorySetting.addChangeListener(this.onModeChanged, this);
    this.showWebVitalsSetting = Common.Settings.Settings.instance().createSetting("timelineWebVitals", false);
    this.showWebVitalsSetting.setTitle(i18nString(UIStrings.webVitals));
    this.showWebVitalsSetting.addChangeListener(this.onWebVitalsChanged, this);
    const timelineToolbarContainer = this.element.createChild("div", "timeline-toolbar-container");
    this.panelToolbar = new UI.Toolbar.Toolbar("timeline-main-toolbar", timelineToolbarContainer);
    this.panelToolbar.makeWrappable(true);
    this.panelRightToolbar = new UI.Toolbar.Toolbar("", timelineToolbarContainer);
    if (!isNode) {
      this.createSettingsPane();
      this.updateShowSettingsToolbarButton();
    }
    this.timelinePane = new UI.Widget.VBox();
    this.timelinePane.show(this.element);
    const topPaneElement = this.timelinePane.element.createChild("div", "hbox");
    topPaneElement.id = "timeline-overview-panel";
    this.overviewPane = new PerfUI.TimelineOverviewPane.TimelineOverviewPane("timeline");
    this.overviewPane.addEventListener(PerfUI.TimelineOverviewPane.Events.WindowChanged, this.onOverviewWindowChanged.bind(this));
    this.overviewPane.show(topPaneElement);
    this.overviewControls = [];
    this.statusPaneContainer = this.timelinePane.element.createChild("div", "status-pane-container fill");
    this.createFileSelector();
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);
    this.flameChart = new TimelineFlameChartView(this);
    this.searchableViewInternal = new UI.SearchableView.SearchableView(this.flameChart, null);
    this.searchableViewInternal.setMinimumSize(0, 100);
    this.searchableViewInternal.element.classList.add("searchable-view");
    this.searchableViewInternal.show(this.timelinePane.element);
    this.flameChart.show(this.searchableViewInternal.element);
    this.flameChart.setSearchableView(this.searchableViewInternal);
    this.searchableViewInternal.hideWidget();
    this.onModeChanged();
    this.onWebVitalsChanged();
    this.populateToolbar();
    this.showLandingPage();
    this.updateTimelineControls();
    Extensions.ExtensionServer.ExtensionServer.instance().addEventListener(Extensions.ExtensionServer.Events.TraceProviderAdded, this.appendExtensionsToToolbar, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(SDK.TargetManager.Events.SuspendStateChanged, this.onSuspendStateChanged, this);
    if (Root.Runtime.experiments.isEnabled("timelineAsConsoleProfileResultPanel")) {
      const profilerModels = SDK.TargetManager.TargetManager.instance().models(SDK.CPUProfilerModel.CPUProfilerModel);
      for (const model of profilerModels) {
        for (const message of model.registeredConsoleProfileMessages) {
          this.consoleProfileFinished(message);
        }
      }
      SDK.TargetManager.TargetManager.instance().addModelListener(SDK.CPUProfilerModel.CPUProfilerModel, SDK.CPUProfilerModel.Events.ConsoleProfileFinished, (event) => this.consoleProfileFinished(event.data), this);
    }
  }
  static instance(opts = { forceNew: null, isNode: false }) {
    const { forceNew, isNode: isNodeMode } = opts;
    isNode = isNodeMode;
    if (!timelinePanelInstance || forceNew) {
      timelinePanelInstance = new TimelinePanel();
    }
    return timelinePanelInstance;
  }
  searchableView() {
    return this.searchableViewInternal;
  }
  wasShown() {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(TimelinePanel, this);
    this.registerCSSFiles([timelinePanelStyles]);
    Host.userMetrics.panelLoaded("timeline", "DevTools.Launch.Timeline");
  }
  willHide() {
    UI.Context.Context.instance().setFlavor(TimelinePanel, null);
    this.historyManager.cancelIfShowing();
  }
  loadFromEvents(events) {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromEvents(events, this);
  }
  loadFromCpuProfile(profile, title) {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromCpuProfile(profile, this, title);
  }
  onOverviewWindowChanged(event) {
    if (!this.performanceModel) {
      return;
    }
    const left = event.data.startTime;
    const right = event.data.endTime;
    this.performanceModel.setWindow({ left, right }, true);
  }
  onModelWindowChanged(event) {
    const window2 = event.data.window;
    this.overviewPane.setWindowTimes(window2.left, window2.right);
  }
  setState(state) {
    this.state = state;
    this.updateTimelineControls();
  }
  createSettingCheckbox(setting, tooltip) {
    const checkboxItem = new UI.Toolbar.ToolbarSettingCheckbox(setting, tooltip);
    this.recordingOptionUIControls.push(checkboxItem);
    return checkboxItem;
  }
  populateToolbar() {
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.recordReloadAction));
    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), "largeicon-clear");
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this.onClearButton());
    this.panelToolbar.appendToolbarItem(this.clearButton);
    this.loadButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.loadProfile), "largeicon-load");
    this.loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceImported);
      this.selectFileToLoad();
    });
    this.saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveProfile), "largeicon-download");
    this.saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, (_event) => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
      void this.saveToFile();
    });
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.loadButton);
    this.panelToolbar.appendToolbarItem(this.saveButton);
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.historyManager.button());
    this.panelToolbar.registerCSSFiles([historyToolbarButtonStyles]);
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendSeparator();
    if (!isNode) {
      this.showScreenshotsToolbarCheckbox = this.createSettingCheckbox(this.showScreenshotsSetting, i18nString(UIStrings.captureScreenshots));
      this.panelToolbar.appendToolbarItem(this.showScreenshotsToolbarCheckbox);
    }
    this.showMemoryToolbarCheckbox = this.createSettingCheckbox(this.showMemorySetting, i18nString(UIStrings.showMemoryTimeline));
    this.panelToolbar.appendToolbarItem(this.showMemoryToolbarCheckbox);
    if (!isNode) {
      this.showWebVitalsToolbarCheckbox = this.createSettingCheckbox(this.showWebVitalsSetting, i18nString(UIStrings.showWebVitals));
      this.panelToolbar.appendToolbarItem(this.showWebVitalsToolbarCheckbox);
    }
    if (Root.Runtime.experiments.isEnabled("recordCoverageWithPerformanceTracing")) {
      this.startCoverageCheckbox = this.createSettingCheckbox(this.startCoverage, i18nString(UIStrings.recordCoverageWithPerformance));
      this.panelToolbar.appendToolbarItem(this.startCoverageCheckbox);
    }
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId("components.collect-garbage"));
    if (!isNode) {
      this.panelRightToolbar.appendSeparator();
      this.panelRightToolbar.appendToolbarItem(this.showSettingsPaneButton);
    }
  }
  createSettingsPane() {
    this.showSettingsPaneSetting = Common.Settings.Settings.instance().createSetting("timelineShowSettingsToolbar", false);
    this.showSettingsPaneButton = new UI.Toolbar.ToolbarSettingToggle(this.showSettingsPaneSetting, "largeicon-settings-gear", i18nString(UIStrings.captureSettings));
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this.updateShowSettingsToolbarButton, this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(SDK.CPUThrottlingManager.Events.RateChanged, this.updateShowSettingsToolbarButton, this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(SDK.CPUThrottlingManager.Events.HardwareConcurrencyChanged, this.updateShowSettingsToolbarButton, this);
    this.disableCaptureJSProfileSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.captureLayersAndPicturesSetting.addChangeListener(this.updateShowSettingsToolbarButton, this);
    this.settingsPane = new UI.Widget.HBox();
    this.settingsPane.element.classList.add("timeline-settings-pane");
    this.settingsPane.show(this.element);
    const captureToolbar = new UI.Toolbar.Toolbar("", this.settingsPane.element);
    captureToolbar.element.classList.add("flex-auto");
    captureToolbar.makeVertical();
    captureToolbar.appendToolbarItem(this.createSettingCheckbox(this.disableCaptureJSProfileSetting, i18nString(UIStrings.disablesJavascriptSampling)));
    captureToolbar.appendToolbarItem(this.createSettingCheckbox(this.captureLayersAndPicturesSetting, i18nString(UIStrings.capturesAdvancedPaint)));
    const throttlingPane = new UI.Widget.VBox();
    throttlingPane.element.classList.add("flex-auto");
    throttlingPane.show(this.settingsPane.element);
    const cpuThrottlingToolbar = new UI.Toolbar.Toolbar("", throttlingPane.element);
    cpuThrottlingToolbar.appendText(i18nString(UIStrings.cpu));
    this.cpuThrottlingSelect = MobileThrottling.ThrottlingManager.throttlingManager().createCPUThrottlingSelector();
    cpuThrottlingToolbar.appendToolbarItem(this.cpuThrottlingSelect);
    const networkThrottlingToolbar = new UI.Toolbar.Toolbar("", throttlingPane.element);
    networkThrottlingToolbar.appendText(i18nString(UIStrings.network));
    this.networkThrottlingSelect = this.createNetworkConditionsSelect();
    networkThrottlingToolbar.appendToolbarItem(this.networkThrottlingSelect);
    const hardwareConcurrencyPane = new UI.Widget.VBox();
    hardwareConcurrencyPane.element.classList.add("flex-auto");
    hardwareConcurrencyPane.show(this.settingsPane.element);
    const { toggle, input, reset, warning } = MobileThrottling.ThrottlingManager.throttlingManager().createHardwareConcurrencySelector();
    const concurrencyThrottlingToolbar = new UI.Toolbar.Toolbar("", hardwareConcurrencyPane.element);
    concurrencyThrottlingToolbar.registerCSSFiles([timelinePanelStyles]);
    input.element.classList.add("timeline-concurrency-input");
    concurrencyThrottlingToolbar.appendToolbarItem(toggle);
    concurrencyThrottlingToolbar.appendToolbarItem(input);
    concurrencyThrottlingToolbar.appendToolbarItem(reset);
    concurrencyThrottlingToolbar.appendToolbarItem(warning);
    this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
    this.updateSettingsPaneVisibility();
  }
  appendExtensionsToToolbar(event) {
    const provider = event.data;
    const setting = TimelinePanel.settingForTraceProvider(provider);
    const checkbox = this.createSettingCheckbox(setting, provider.longDisplayName());
    this.panelToolbar.appendToolbarItem(checkbox);
  }
  static settingForTraceProvider(traceProvider) {
    let setting = traceProviderToSetting.get(traceProvider);
    if (!setting) {
      const providerId = traceProvider.persistentIdentifier();
      setting = Common.Settings.Settings.instance().createSetting(providerId, false);
      setting.setTitle(traceProvider.shortDisplayName());
      traceProviderToSetting.set(traceProvider, setting);
    }
    return setting;
  }
  createNetworkConditionsSelect() {
    const toolbarItem = new UI.Toolbar.ToolbarComboBox(null, i18nString(UIStrings.networkConditions));
    toolbarItem.setMaxWidth(140);
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(toolbarItem.selectElement());
    return toolbarItem;
  }
  prepareToLoadTimeline() {
    console.assert(this.state === State.Idle);
    this.setState(State.Loading);
    if (this.performanceModel) {
      this.performanceModel.dispose();
      this.performanceModel = null;
    }
  }
  createFileSelector() {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.remove();
    }
    this.fileSelectorElement = UI.UIUtils.createFileSelectorElement(this.loadFromFile.bind(this));
    this.timelinePane.element.appendChild(this.fileSelectorElement);
  }
  contextMenu(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation("timelineMenu");
    void contextMenu.show();
  }
  async saveToFile() {
    if (this.state !== State.Idle) {
      return;
    }
    const performanceModel = this.performanceModel;
    if (!performanceModel) {
      return;
    }
    const now = Platform.DateUtilities.toISO8601Compact(new Date());
    let fileName;
    if (isNode) {
      fileName = `CPU-${now}.cpuprofile`;
    } else {
      fileName = `Profile-${now}.json`;
    }
    const stream = new Bindings.FileUtils.FileOutputStream();
    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }
    const error = await performanceModel.save(stream);
    if (!error) {
      return;
    }
    Common.Console.Console.instance().error(i18nString(UIStrings.failedToSaveTimelineSSS, { PH1: error.message, PH2: error.name, PH3: error.code }));
  }
  async showHistory() {
    const model = await this.historyManager.showHistoryDropDown();
    if (model && model !== this.performanceModel) {
      this.setModel(model);
    }
  }
  navigateHistory(direction) {
    const model = this.historyManager.navigate(direction);
    if (model && model !== this.performanceModel) {
      this.setModel(model);
    }
    return true;
  }
  selectFileToLoad() {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.click();
    }
  }
  async loadFromFile(file) {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = await TimelineLoader.loadFromFile(file, this);
    this.createFileSelector();
  }
  loadFromURL(url) {
    if (this.state !== State.Idle) {
      return;
    }
    this.prepareToLoadTimeline();
    this.loader = TimelineLoader.loadFromURL(url, this);
  }
  updateOverviewControls() {
    this.overviewControls = [];
    this.overviewControls.push(new TimelineEventOverviewResponsiveness());
    if (Root.Runtime.experiments.isEnabled("inputEventsOnTimelineOverview")) {
      this.overviewControls.push(new TimelineEventOverviewInput());
    }
    this.overviewControls.push(new TimelineEventOverviewCPUActivity());
    this.overviewControls.push(new TimelineEventOverviewNetwork());
    if (this.showScreenshotsSetting.get() && this.performanceModel && this.performanceModel.filmStripModel().frames().length) {
      this.overviewControls.push(new TimelineFilmStripOverview());
    }
    if (this.showMemorySetting.get()) {
      this.overviewControls.push(new TimelineEventOverviewMemory());
    }
    if (this.startCoverage.get()) {
      this.overviewControls.push(new TimelineEventOverviewCoverage());
    }
    for (const control of this.overviewControls) {
      control.setModel(this.performanceModel);
    }
    this.overviewPane.setOverviewControls(this.overviewControls);
  }
  onModeChanged() {
    this.updateOverviewControls();
    this.doResize();
    this.select(null);
  }
  onWebVitalsChanged() {
    this.flameChart.toggleWebVitalsLane();
  }
  updateSettingsPaneVisibility() {
    if (this.showSettingsPaneSetting.get()) {
      this.settingsPane.showWidget();
    } else {
      this.settingsPane.hideWidget();
    }
  }
  updateShowSettingsToolbarButton() {
    const messages = [];
    if (SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate() !== 1) {
      messages.push(i18nString(UIStrings.CpuThrottlingIsEnabled));
    }
    if (MobileThrottling.ThrottlingManager.throttlingManager().hardwareConcurrencyOverrideEnabled) {
      messages.push(i18nString(UIStrings.HardwareConcurrencyIsEnabled));
    }
    if (SDK.NetworkManager.MultitargetNetworkManager.instance().isThrottling()) {
      messages.push(i18nString(UIStrings.NetworkThrottlingIsEnabled));
    }
    if (this.captureLayersAndPicturesSetting.get()) {
      messages.push(i18nString(UIStrings.SignificantOverheadDueToPaint));
    }
    if (this.disableCaptureJSProfileSetting.get()) {
      messages.push(i18nString(UIStrings.JavascriptSamplingIsDisabled));
    }
    this.showSettingsPaneButton.setDefaultWithRedColor(messages.length > 0);
    this.showSettingsPaneButton.setToggleWithRedColor(messages.length > 0);
    if (messages.length) {
      const tooltipElement = document.createElement("div");
      messages.forEach((message) => {
        tooltipElement.createChild("div").textContent = message;
      });
      this.showSettingsPaneButton.setTitle(tooltipElement.textContent || "");
    } else {
      this.showSettingsPaneButton.setTitle(i18nString(UIStrings.captureSettings));
    }
  }
  setUIControlsEnabled(enabled) {
    this.recordingOptionUIControls.forEach((control) => control.setEnabled(enabled));
  }
  async getCoverageViewWidget() {
    const view = UI.ViewManager.ViewManager.instance().view("coverage");
    return await view.widget();
  }
  async #evaluateInspectedURL() {
    if (!this.controller) {
      return Platform.DevToolsPath.EmptyUrlString;
    }
    const mainTarget = this.controller.mainTarget();
    const inspectedURL = mainTarget.inspectedURL();
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const navHistory = resourceTreeModel && await resourceTreeModel.navigationHistory();
    if (!resourceTreeModel || !navHistory) {
      return inspectedURL;
    }
    const { currentIndex, entries } = navHistory;
    const navigationEntry = entries[currentIndex];
    return navigationEntry.url;
  }
  async #navigateToAboutBlank() {
    const aboutBlankNavigationComplete = new Promise(async (resolve, reject) => {
      if (!this.controller) {
        reject("Could not find TimelineController");
        return;
      }
      const target = this.controller.mainTarget();
      const resourceModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        reject("Could not load resourceModel");
        return;
      }
      function waitForAboutBlank(event) {
        if (event.data.url === "about:blank") {
          resolve();
        } else {
          reject(`Unexpected navigation to ${event.data.url}`);
        }
        resourceModel?.removeEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      }
      resourceModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, waitForAboutBlank);
      await resourceModel.navigate("about:blank");
    });
    await aboutBlankNavigationComplete;
  }
  async startRecording() {
    console.assert(!this.statusPane, "Status pane is already opened.");
    this.setState(State.StartPending);
    if (!isNode) {
      const recordingOptions = {
        enableJSSampling: !this.disableCaptureJSProfileSetting.get(),
        capturePictures: this.captureLayersAndPicturesSetting.get(),
        captureFilmStrip: this.showScreenshotsSetting.get(),
        startCoverage: this.startCoverage.get()
      };
      if (recordingOptions.startCoverage) {
        await UI.ViewManager.ViewManager.instance().showView("coverage").then(() => this.getCoverageViewWidget()).then((widget) => widget.ensureRecordingStarted());
      }
      this.showRecordingStarted();
      const enabledTraceProviders = Extensions.ExtensionServer.ExtensionServer.instance().traceProviders().filter((provider) => TimelinePanel.settingForTraceProvider(provider).get());
      const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
      if (UIDevtoolsUtils.isUiDevTools()) {
        this.controller = new UIDevtoolsController(mainTarget, this);
      } else {
        this.controller = new TimelineController(mainTarget, this);
      }
      this.setUIControlsEnabled(false);
      this.hideLandingPage();
      if (!this.controller) {
        throw new Error("Could not create Timeline controller");
      }
      const urlToTrace = await this.#evaluateInspectedURL();
      try {
        if (this.recordingPageReload) {
          await this.#navigateToAboutBlank();
        }
        const response = await this.controller.startRecording(recordingOptions, enabledTraceProviders);
        if (response.getError()) {
          throw new Error(response.getError());
        }
        const recordingConfig = this.recordingPageReload ? { navigateToUrl: urlToTrace } : void 0;
        this.recordingStarted(recordingConfig);
      } catch (e) {
        this.recordingFailed(e.message);
      }
    } else {
      this.showRecordingStarted();
      const firstNodeTarget = SDK.TargetManager.TargetManager.instance().targets().find((target) => target.type() === SDK.Target.Type.Node);
      if (firstNodeTarget) {
        this.cpuProfiler = firstNodeTarget.model(SDK.CPUProfilerModel.CPUProfilerModel);
      }
      if (this.cpuProfiler) {
        this.setUIControlsEnabled(false);
        this.hideLandingPage();
        await SDK.TargetManager.TargetManager.instance().suspendAllTargets("performance-timeline");
        await this.cpuProfiler.startRecording();
        this.recordingStarted();
      }
    }
  }
  async stopRecording() {
    if (this.statusPane) {
      this.statusPane.finish();
      this.statusPane.updateStatus(i18nString(UIStrings.stoppingTimeline));
      this.statusPane.updateProgressBar(i18nString(UIStrings.received), 0);
    }
    this.setState(State.StopPending);
    if (this.startCoverage.get()) {
      await UI.ViewManager.ViewManager.instance().showView("coverage").then(() => this.getCoverageViewWidget()).then((widget) => widget.stopRecording());
    }
    if (this.controller) {
      this.performanceModel = this.controller.getPerformanceModel();
      await this.controller.stopRecording();
      this.setUIControlsEnabled(true);
      this.controller.dispose();
      this.controller = null;
      return;
    }
    if (this.cpuProfiler) {
      const profile = await this.cpuProfiler.stopRecording();
      this.setState(State.Idle);
      this.loadFromCpuProfile(profile);
      this.setUIControlsEnabled(true);
      this.cpuProfiler = null;
      await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    }
  }
  recordingFailed(error) {
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane({
      description: error,
      buttonText: i18nString(UIStrings.close),
      buttonDisabled: false,
      showProgress: void 0,
      showTimer: void 0
    }, () => this.loadingComplete(null));
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.recordingFailed));
    this.setState(State.RecordingFailed);
    this.performanceModel = null;
    this.setUIControlsEnabled(true);
    if (this.controller) {
      this.controller.dispose();
      this.controller = null;
    }
  }
  onSuspendStateChanged() {
    this.updateTimelineControls();
  }
  consoleProfileFinished(data) {
    if (!isNode) {
      return;
    }
    this.loadFromCpuProfile(data.cpuProfile, data.title);
    void UI.InspectorView.InspectorView.instance().showPanel("timeline");
  }
  updateTimelineControls() {
    const state = State;
    this.toggleRecordAction.setToggled(this.state === state.Recording);
    this.toggleRecordAction.setEnabled(this.state === state.Recording || this.state === state.Idle);
    this.recordReloadAction.setEnabled(isNode ? false : this.state === state.Idle);
    this.historyManager.setEnabled(this.state === state.Idle);
    this.clearButton.setEnabled(this.state === state.Idle);
    this.panelToolbar.setEnabled(this.state !== state.Loading);
    this.panelRightToolbar.setEnabled(this.state !== state.Loading);
    this.dropTarget.setEnabled(this.state === state.Idle);
    this.loadButton.setEnabled(this.state === state.Idle);
    this.saveButton.setEnabled(this.state === state.Idle && Boolean(this.performanceModel));
  }
  async toggleRecording() {
    if (this.state === State.Idle) {
      this.recordingPageReload = false;
      await this.startRecording();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelineStarted);
    } else if (this.state === State.Recording) {
      await this.stopRecording();
    }
  }
  recordReload() {
    if (this.state !== State.Idle) {
      return;
    }
    this.recordingPageReload = true;
    void this.startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelinePageReloadStarted);
  }
  onClearButton() {
    this.historyManager.clear();
    this.clear();
  }
  clear() {
    this.showLandingPage();
    this.reset();
  }
  reset() {
    PerfUI.LineLevelProfile.Performance.instance().reset();
    if (this.performanceModel) {
      this.performanceModel.removeEventListener(Events.NamesResolved, this.updateModelAndFlameChart, this);
    }
    this.setModel(null);
  }
  applyFilters(model) {
    if (model.timelineModel().isGenericTrace() || Root.Runtime.experiments.isEnabled("timelineShowAllEvents")) {
      return;
    }
    model.setFilters([TimelineUIUtils.visibleEventsFilter()]);
  }
  setModel(model) {
    if (this.performanceModel) {
      this.performanceModel.removeEventListener(Events.WindowChanged, this.onModelWindowChanged, this);
    }
    this.performanceModel = model;
    if (model) {
      this.searchableViewInternal.showWidget();
      this.applyFilters(model);
    } else {
      this.searchableViewInternal.hideWidget();
    }
    this.flameChart.setModel(model);
    this.updateOverviewControls();
    this.overviewPane.reset();
    if (model && this.performanceModel) {
      this.performanceModel.addEventListener(Events.WindowChanged, this.onModelWindowChanged, this);
      this.overviewPane.setNavStartTimes(model.timelineModel().navStartTimes());
      this.overviewPane.setBounds(model.timelineModel().minimumRecordTime(), model.timelineModel().maximumRecordTime());
      PerfUI.LineLevelProfile.Performance.instance().reset();
      for (const profile of model.timelineModel().cpuProfiles()) {
        PerfUI.LineLevelProfile.Performance.instance().appendCPUProfile(profile);
      }
      this.setMarkers(model.timelineModel());
      this.flameChart.setSelection(null);
      this.overviewPane.setWindowTimes(model.window().left, model.window().right);
    }
    for (const control of this.overviewControls) {
      control.setModel(model);
    }
    if (this.flameChart) {
      this.flameChart.resizeToPreferredHeights();
    }
    this.updateTimelineControls();
  }
  recordingStarted(config) {
    if (config && this.recordingPageReload && this.controller) {
      const target = this.controller.mainTarget();
      const resourceModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (!resourceModel) {
        this.recordingFailed("Could not navigate to original URL");
        return;
      }
      void resourceModel.navigate(config.navigateToUrl);
    }
    this.reset();
    this.setState(State.Recording);
    this.showRecordingStarted();
    if (this.statusPane) {
      this.statusPane.enableAndFocusButton();
      this.statusPane.updateStatus(i18nString(UIStrings.profiling));
      this.statusPane.updateProgressBar(i18nString(UIStrings.bufferUsage), 0);
      this.statusPane.startTimer();
    }
    this.hideLandingPage();
  }
  recordingProgress(usage) {
    if (this.statusPane) {
      this.statusPane.updateProgressBar(i18nString(UIStrings.bufferUsage), usage * 100);
    }
  }
  showLandingPage() {
    if (this.landingPage) {
      this.landingPage.show(this.statusPaneContainer);
      return;
    }
    function encloseWithTag(tagName, contents) {
      const e = document.createElement(tagName);
      e.textContent = contents;
      return e;
    }
    const learnMoreNode = UI.XLink.XLink.create("https://developer.chrome.com/docs/devtools/evaluate-performance/", i18nString(UIStrings.learnmore));
    const recordKey = encloseWithTag("b", UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("timeline.toggle-recording")[0].title());
    const reloadKey = encloseWithTag("b", UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("timeline.record-reload")[0].title());
    const navigateNode = encloseWithTag("b", i18nString(UIStrings.wasd));
    this.landingPage = new UI.Widget.VBox();
    this.landingPage.contentElement.classList.add("timeline-landing-page", "fill");
    const centered = this.landingPage.contentElement.createChild("div");
    const recordButton = UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    const reloadButton = UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId("timeline.record-reload"));
    centered.createChild("p").appendChild(i18n.i18n.getFormatLocalizedString(str_, UIStrings.clickTheRecordButtonSOrHitSTo, { PH1: recordButton, PH2: recordKey }));
    centered.createChild("p").appendChild(i18n.i18n.getFormatLocalizedString(str_, UIStrings.clickTheReloadButtonSOrHitSTo, { PH1: reloadButton, PH2: reloadKey }));
    centered.createChild("p").appendChild(i18n.i18n.getFormatLocalizedString(str_, UIStrings.afterRecordingSelectAnAreaOf, { PH1: navigateNode, PH2: learnMoreNode }));
    this.landingPage.show(this.statusPaneContainer);
  }
  hideLandingPage() {
    this.landingPage.detach();
  }
  loadingStarted() {
    this.hideLandingPage();
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = new StatusPane({
      showProgress: true,
      showTimer: void 0,
      buttonDisabled: void 0,
      buttonText: void 0,
      description: void 0
    }, () => this.cancelLoading());
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.loadingProfile));
    if (!this.loader) {
      this.statusPane.finish();
    }
    this.loadingProgress(0);
  }
  loadingProgress(progress) {
    if (typeof progress === "number" && this.statusPane) {
      this.statusPane.updateProgressBar(i18nString(UIStrings.received), progress * 100);
    }
  }
  processingStarted() {
    if (this.statusPane) {
      this.statusPane.updateStatus(i18nString(UIStrings.processingProfile));
    }
  }
  updateModelAndFlameChart() {
    if (!this.performanceModel) {
      return;
    }
    this.setModel(this.performanceModel);
    this.flameChart.updateColorMapper();
  }
  async loadingComplete(tracingModel) {
    delete this.loader;
    this.setState(State.Idle);
    if (this.statusPane) {
      this.statusPane.remove();
    }
    this.statusPane = null;
    if (!tracingModel) {
      this.clear();
      return;
    }
    if (!this.performanceModel) {
      this.performanceModel = new PerformanceModel();
    }
    await this.performanceModel.setTracingModel(tracingModel);
    this.setModel(this.performanceModel);
    if (!this.performanceModel.hasEventListeners(Events.NamesResolved)) {
      this.performanceModel.addEventListener(Events.NamesResolved, this.updateModelAndFlameChart, this);
    }
    this.historyManager.addRecording(this.performanceModel);
    if (this.startCoverage.get()) {
      void UI.ViewManager.ViewManager.instance().showView("coverage").then(() => this.getCoverageViewWidget()).then((widget) => widget.processBacklog()).then(() => this.updateOverviewControls());
    }
  }
  loadingCompleteForTest() {
  }
  showRecordingStarted() {
    if (this.statusPane) {
      return;
    }
    this.statusPane = new StatusPane({
      showTimer: true,
      showProgress: true,
      buttonDisabled: true,
      description: void 0,
      buttonText: void 0
    }, () => this.stopRecording());
    this.statusPane.showPane(this.statusPaneContainer);
    this.statusPane.updateStatus(i18nString(UIStrings.initializingProfiler));
  }
  cancelLoading() {
    if (this.loader) {
      this.loader.cancel();
    }
  }
  setMarkers(timelineModel) {
    const markers = /* @__PURE__ */ new Map();
    const recordTypes = TimelineModel.TimelineModel.RecordType;
    const zeroTime = timelineModel.minimumRecordTime();
    for (const event of timelineModel.timeMarkerEvents()) {
      if (event.name === recordTypes.TimeStamp || event.name === recordTypes.ConsoleTime) {
        continue;
      }
      markers.set(event.startTime, TimelineUIUtils.createEventDivider(event, zeroTime));
    }
    for (const navStartTimeEvent of timelineModel.navStartTimes().values()) {
      markers.set(navStartTimeEvent.startTime, TimelineUIUtils.createEventDivider(navStartTimeEvent, zeroTime));
    }
    this.overviewPane.setMarkers(markers);
  }
  async loadEventFired(event) {
    if (this.state !== State.Recording || !this.recordingPageReload || !this.controller || this.controller.mainTarget() !== event.data.resourceTreeModel.target()) {
      return;
    }
    const controller = this.controller;
    await new Promise((r) => window.setTimeout(r, this.millisecondsToRecordAfterLoadEvent));
    if (controller !== this.controller || this.state !== State.Recording) {
      return;
    }
    void this.stopRecording();
  }
  frameForSelection(selection) {
    switch (selection.type()) {
      case TimelineSelection.Type.Frame:
        return selection.object();
      case TimelineSelection.Type.Range:
        return null;
      case TimelineSelection.Type.TraceEvent:
        if (!this.performanceModel) {
          return null;
        }
        return this.performanceModel.frameModel().getFramesWithinWindow(selection.endTimeInternal, selection.endTimeInternal)[0];
      default:
        console.assert(false, "Should never be reached");
        return null;
    }
  }
  jumpToFrame(offset) {
    const currentFrame = this.selection && this.frameForSelection(this.selection);
    if (!currentFrame || !this.performanceModel) {
      return;
    }
    const frames = this.performanceModel.frames();
    let index = frames.indexOf(currentFrame);
    console.assert(index >= 0, "Can't find current frame in the frame list");
    index = Platform.NumberUtilities.clamp(index + offset, 0, frames.length - 1);
    const frame = frames[index];
    this.revealTimeRange(frame.startTime, frame.endTime);
    this.select(TimelineSelection.fromFrame(frame));
    return true;
  }
  select(selection) {
    this.selection = selection;
    this.flameChart.setSelection(selection);
  }
  selectEntryAtTime(events, time) {
    if (!events) {
      return;
    }
    for (let index = Platform.ArrayUtilities.upperBound(events, time, (time2, event) => time2 - event.startTime) - 1; index >= 0; --index) {
      const event = events[index];
      const endTime = event.endTime || event.startTime;
      if (SDK.TracingModel.TracingModel.isTopLevelEvent(event) && endTime < time) {
        break;
      }
      if (this.performanceModel && this.performanceModel.isVisible(event) && endTime >= time) {
        this.select(TimelineSelection.fromTraceEvent(event));
        return;
      }
    }
    this.select(null);
  }
  highlightEvent(event) {
    this.flameChart.highlightEvent(event);
  }
  revealTimeRange(startTime, endTime) {
    if (!this.performanceModel) {
      return;
    }
    const window2 = this.performanceModel.window();
    let offset = 0;
    if (window2.right < endTime) {
      offset = endTime - window2.right;
    } else if (window2.left > startTime) {
      offset = startTime - window2.left;
    }
    this.performanceModel.setWindow({ left: window2.left + offset, right: window2.right + offset }, true);
  }
  handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const item = items[0];
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceImported);
    if (item.kind === "string") {
      const url = dataTransfer.getData("text/uri-list");
      if (new Common.ParsedURL.ParsedURL(url).isValid) {
        this.loadFromURL(url);
      }
    } else if (item.kind === "file") {
      const file = items[0].getAsFile();
      if (!file) {
        return;
      }
      void this.loadFromFile(file);
    }
  }
}
export var State = /* @__PURE__ */ ((State2) => {
  State2["Idle"] = "Idle";
  State2["StartPending"] = "StartPending";
  State2["Recording"] = "Recording";
  State2["StopPending"] = "StopPending";
  State2["Loading"] = "Loading";
  State2["RecordingFailed"] = "RecordingFailed";
  return State2;
})(State || {});
export var ViewMode = /* @__PURE__ */ ((ViewMode2) => {
  ViewMode2["FlameChart"] = "FlameChart";
  ViewMode2["BottomUp"] = "BottomUp";
  ViewMode2["CallTree"] = "CallTree";
  ViewMode2["EventLog"] = "EventLog";
  return ViewMode2;
})(ViewMode || {});
export const rowHeight = 18;
export const headerHeight = 20;
export class TimelineSelection {
  typeInternal;
  startTimeInternal;
  endTimeInternal;
  objectInternal;
  constructor(type, startTime, endTime, object) {
    this.typeInternal = type;
    this.startTimeInternal = startTime;
    this.endTimeInternal = endTime;
    this.objectInternal = object || null;
  }
  static fromFrame(frame) {
    return new TimelineSelection(TimelineSelection.Type.Frame, frame.startTime, frame.endTime, frame);
  }
  static fromNetworkRequest(request) {
    return new TimelineSelection(TimelineSelection.Type.NetworkRequest, request.startTime, request.endTime || request.startTime, request);
  }
  static fromTraceEvent(event) {
    return new TimelineSelection(TimelineSelection.Type.TraceEvent, event.startTime, event.endTime || event.startTime + 1, event);
  }
  static fromRange(startTime, endTime) {
    return new TimelineSelection(TimelineSelection.Type.Range, startTime, endTime);
  }
  type() {
    return this.typeInternal;
  }
  object() {
    return this.objectInternal;
  }
  startTime() {
    return this.startTimeInternal;
  }
  endTime() {
    return this.endTimeInternal;
  }
}
((TimelineSelection2) => {
  let Type;
  ((Type2) => {
    Type2["Frame"] = "Frame";
    Type2["NetworkRequest"] = "NetworkRequest";
    Type2["TraceEvent"] = "TraceEvent";
    Type2["Range"] = "Range";
  })(Type = TimelineSelection2.Type || (TimelineSelection2.Type = {}));
})(TimelineSelection || (TimelineSelection = {}));
export class StatusPane extends UI.Widget.VBox {
  status;
  time;
  progressLabel;
  progressBar;
  description;
  button;
  startTime;
  timeUpdateTimer;
  constructor(options, buttonCallback) {
    super(true);
    this.contentElement.classList.add("timeline-status-dialog");
    const statusLine = this.contentElement.createChild("div", "status-dialog-line status");
    statusLine.createChild("div", "label").textContent = i18nString(UIStrings.status);
    this.status = statusLine.createChild("div", "content");
    UI.ARIAUtils.markAsStatus(this.status);
    if (options.showTimer) {
      const timeLine = this.contentElement.createChild("div", "status-dialog-line time");
      timeLine.createChild("div", "label").textContent = i18nString(UIStrings.time);
      this.time = timeLine.createChild("div", "content");
    }
    if (options.showProgress) {
      const progressLine = this.contentElement.createChild("div", "status-dialog-line progress");
      this.progressLabel = progressLine.createChild("div", "label");
      this.progressBar = progressLine.createChild("div", "indicator-container").createChild("div", "indicator");
      UI.ARIAUtils.markAsProgressBar(this.progressBar);
    }
    if (typeof options.description === "string") {
      const descriptionLine = this.contentElement.createChild("div", "status-dialog-line description");
      descriptionLine.createChild("div", "label").textContent = i18nString(UIStrings.description);
      this.description = descriptionLine.createChild("div", "content");
      this.description.innerText = options.description;
    }
    const buttonText = options.buttonText || i18nString(UIStrings.stop);
    this.button = UI.UIUtils.createTextButton(buttonText, buttonCallback, "", true);
    this.button.disabled = !options.buttonDisabled === false;
    this.contentElement.createChild("div", "stop-button").appendChild(this.button);
  }
  finish() {
    this.stopTimer();
    this.button.disabled = true;
  }
  remove() {
    this.element.parentNode.classList.remove("tinted");
    this.arrangeDialog(this.element.parentNode);
    this.stopTimer();
    this.element.remove();
  }
  showPane(parent) {
    this.arrangeDialog(parent);
    this.show(parent);
    parent.classList.add("tinted");
  }
  enableAndFocusButton() {
    this.button.disabled = false;
    this.button.focus();
  }
  updateStatus(text) {
    this.status.textContent = text;
  }
  updateProgressBar(activity, percent) {
    this.progressLabel.textContent = activity;
    this.progressBar.style.width = percent.toFixed(1) + "%";
    UI.ARIAUtils.setValueNow(this.progressBar, percent);
    this.updateTimer();
  }
  startTimer() {
    this.startTime = Date.now();
    this.timeUpdateTimer = window.setInterval(this.updateTimer.bind(this, false), 1e3);
    this.updateTimer();
  }
  stopTimer() {
    if (!this.timeUpdateTimer) {
      return;
    }
    clearInterval(this.timeUpdateTimer);
    this.updateTimer(true);
    delete this.timeUpdateTimer;
  }
  updateTimer(precise) {
    this.arrangeDialog(this.element.parentNode);
    if (!this.timeUpdateTimer) {
      return;
    }
    const elapsed = (Date.now() - this.startTime) / 1e3;
    this.time.textContent = i18nString(UIStrings.ssec, { PH1: elapsed.toFixed(precise ? 1 : 0) });
  }
  arrangeDialog(parent) {
    const isSmallDialog = parent.clientWidth < 325;
    this.element.classList.toggle("small-dialog", isSmallDialog);
    this.contentElement.classList.toggle("small-dialog", isSmallDialog);
  }
  wasShown() {
    super.wasShown();
    this.registerCSSFiles([timelineStatusDialogStyles]);
  }
}
let loadTimelineHandlerInstance;
export class LoadTimelineHandler {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!loadTimelineHandlerInstance || forceNew) {
      loadTimelineHandlerInstance = new LoadTimelineHandler();
    }
    return loadTimelineHandlerInstance;
  }
  handleQueryParam(value) {
    void UI.ViewManager.ViewManager.instance().showView("timeline").then(() => {
      TimelinePanel.instance().loadFromURL(window.decodeURIComponent(value));
    });
  }
}
let actionDelegateInstance;
export class ActionDelegate {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }
    return actionDelegateInstance;
  }
  handleAction(context, actionId) {
    const panel = UI.Context.Context.instance().flavor(TimelinePanel);
    console.assert(panel && panel instanceof TimelinePanel);
    switch (actionId) {
      case "timeline.toggle-recording":
        void panel.toggleRecording();
        return true;
      case "timeline.record-reload":
        panel.recordReload();
        return true;
      case "timeline.save-to-file":
        void panel.saveToFile();
        return true;
      case "timeline.load-from-file":
        panel.selectFileToLoad();
        return true;
      case "timeline.jump-to-previous-frame":
        panel.jumpToFrame(-1);
        return true;
      case "timeline.jump-to-next-frame":
        panel.jumpToFrame(1);
        return true;
      case "timeline.show-history":
        void panel.showHistory();
        return true;
      case "timeline.previous-recording":
        panel.navigateHistory(1);
        return true;
      case "timeline.next-recording":
        panel.navigateHistory(-1);
        return true;
    }
    return false;
  }
}
const traceProviderToSetting = /* @__PURE__ */ new WeakMap();
//# sourceMappingURL=TimelinePanel.js.map
