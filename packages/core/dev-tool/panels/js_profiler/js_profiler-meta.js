import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
const UIStrings = {
  profiler: "Profiler",
  showProfiler: "Show Profiler",
  performance: "Performance",
  showPerformance: "Show Performance",
  startStopRecording: "Start/stop recording",
  showRecentTimelineSessions: "Show recent timeline sessions",
  record: "Record",
  stop: "Stop",
  startProfilingAndReloadPage: "Start profiling and reload page"
};
const str_ = i18n.i18n.registerUIStrings("panels/js_profiler/js_profiler-meta.ts", UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
let loadedTimelineModule;
let loadedProfilerModule;
async function loadProfilerModule() {
  if (!loadedProfilerModule) {
    loadedProfilerModule = await import("../profiler/profiler.js");
  }
  return loadedProfilerModule;
}
async function loadTimelineModule() {
  if (!loadedTimelineModule) {
    loadedTimelineModule = await import("../timeline/timeline.js");
  }
  return loadedTimelineModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
  if (loadedProfilerModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedProfilerModule);
}
function maybeRetrieveTimelineContextTypes(getClassCallBack) {
  if (loadedTimelineModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedTimelineModule);
}
UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: "js_profiler",
  title: i18nLazyString(UIStrings.profiler),
  commandPrompt: i18nLazyString(UIStrings.showProfiler),
  order: 65,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.ProfilesPanel.JSProfilerPanel.instance();
  }
});
UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: "timeline",
  title: i18nLazyString(UIStrings.performance),
  commandPrompt: i18nLazyString(UIStrings.showPerformance),
  order: 66,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  hasToolbar: false,
  isPreviewFeature: true,
  async loadView() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.TimelinePanel.instance({ forceNew: null, isNode: true });
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "profiler.js-toggle-recording",
  category: UI.ActionRegistration.ActionCategory.JAVASCRIPT_PROFILER,
  title: i18nLazyString(UIStrings.startStopRecording),
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes((Profiler) => [Profiler.ProfilesPanel.JSProfilerPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.ProfilesPanel.JSProfilerPanel.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: "Ctrl+E"
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: "Meta+E"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "timeline.show-history",
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.showRecentTimelineSessions),
  contextTypes() {
    return maybeRetrieveTimelineContextTypes((Timeline) => [Timeline.TimelinePanel.TimelinePanel]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: "Ctrl+H"
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: "Meta+Y"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "timeline.toggle-recording",
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveTimelineContextTypes((Timeline) => [Timeline.TimelinePanel.TimelinePanel]);
  },
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.record)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.stop)
    }
  ],
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: "Ctrl+E"
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: "Meta+E"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "timeline.record-reload",
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_REFRESH,
  contextTypes() {
    return maybeRetrieveTimelineContextTypes((Timeline) => [Timeline.TimelinePanel.TimelinePanel]);
  },
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.startProfilingAndReloadPage),
  async loadActionDelegate() {
    const Timeline = await loadTimelineModule();
    return Timeline.TimelinePanel.ActionDelegate.instance();
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: "Ctrl+Shift+E"
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: "Meta+Shift+E"
    }
  ]
});
//# sourceMappingURL=js_profiler-meta.js.map
