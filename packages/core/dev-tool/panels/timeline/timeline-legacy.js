import * as TimelineModule from "./timeline.js";
self.Timeline = self.Timeline || {};
Timeline = Timeline || {};
Timeline.CLSLinkifier = Timeline.CLSLinkifier || {};
Timeline.CLSLinkifier.CLSRect = TimelineModule.CLSLinkifier.CLSRect;
Timeline.CLSLinkifier.Linkifier = TimelineModule.CLSLinkifier.Linkifier;
Timeline.CountersGraph = TimelineModule.CountersGraph.CountersGraph;
Timeline.CountersGraph.Counter = TimelineModule.CountersGraph.Counter;
Timeline.CountersGraph.CounterUI = TimelineModule.CountersGraph.CounterUI;
Timeline.CountersGraph.Calculator = TimelineModule.CountersGraph.Calculator;
Timeline.EventsTimelineTreeView = TimelineModule.EventsTimelineTreeView.EventsTimelineTreeView;
Timeline.EventsTimelineTreeView.Filters = TimelineModule.EventsTimelineTreeView.Filters;
Timeline.ExtensionTracingSession = TimelineModule.ExtensionTracingSession.ExtensionTracingSession;
Timeline.PerformanceModel = TimelineModule.PerformanceModel.PerformanceModel;
Timeline.PerformanceModel.Events = TimelineModule.PerformanceModel.Events;
Timeline.TimelineController = TimelineModule.TimelineController.TimelineController;
Timeline.TimelineController.Client = TimelineModule.TimelineController.Client;
Timeline.TimelineDetailsView = TimelineModule.TimelineDetailsView.TimelineDetailsView;
Timeline.TimelineDetailsView.Tab = TimelineModule.TimelineDetailsView.Tab;
Timeline.TimelineEventOverview = TimelineModule.TimelineEventOverview.TimelineEventOverview;
Timeline.TimelineEventOverviewInput = TimelineModule.TimelineEventOverview.TimelineEventOverviewInput;
Timeline.TimelineEventOverviewNetwork = TimelineModule.TimelineEventOverview.TimelineEventOverviewNetwork;
Timeline.TimelineEventOverviewCPUActivity = TimelineModule.TimelineEventOverview.TimelineEventOverviewCPUActivity;
Timeline.TimelineEventOverviewResponsiveness = TimelineModule.TimelineEventOverview.TimelineEventOverviewResponsiveness;
Timeline.TimelineFilmStripOverview = TimelineModule.TimelineEventOverview.TimelineFilmStripOverview;
Timeline.TimelineEventOverviewMemory = TimelineModule.TimelineEventOverview.TimelineEventOverviewMemory;
Timeline.Quantizer = TimelineModule.TimelineEventOverview.Quantizer;
Timeline.TimelineEventOverviewCoverage = TimelineModule.TimelineEventOverview.TimelineEventOverviewCoverage;
Timeline.TimelineFilters = {};
Timeline.TimelineFilters.IsLong = TimelineModule.TimelineFilters.IsLong;
Timeline.TimelineFilters.Category = TimelineModule.TimelineFilters.Category;
Timeline.TimelineFilters.RegExp = TimelineModule.TimelineFilters.TimelineRegExp;
Timeline.TimelineFlameChartDataProvider = TimelineModule.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider;
Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs = TimelineModule.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
Timeline.TimelineFlameChartDataProvider.Events = TimelineModule.TimelineFlameChartDataProvider.Events;
Timeline.TimelineFlameChartDataProvider.EntryType = TimelineModule.TimelineFlameChartDataProvider.EntryType;
Timeline.TimelineFlameChartNetworkDataProvider = TimelineModule.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;
Timeline.TimelineFlameChartView = TimelineModule.TimelineFlameChartView.TimelineFlameChartView;
Timeline.TimelineFlameChartView.Selection = TimelineModule.TimelineFlameChartView.Selection;
Timeline.TimelineFlameChartView._ColorBy = TimelineModule.TimelineFlameChartView.ColorBy;
Timeline.FlameChartStyle = TimelineModule.TimelineFlameChartView.FlameChartStyle;
Timeline.TimelineFlameChartMarker = TimelineModule.TimelineFlameChartView.TimelineFlameChartMarker;
Timeline.TimelineHistoryManager = TimelineModule.TimelineHistoryManager.TimelineHistoryManager;
Timeline.TimelineHistoryManager.DropDown = TimelineModule.TimelineHistoryManager.DropDown;
Timeline.TimelineHistoryManager.ToolbarButton = TimelineModule.TimelineHistoryManager.ToolbarButton;
Timeline.TimelineLayersView = TimelineModule.TimelineLayersView.TimelineLayersView;
Timeline.TimelineLoader = TimelineModule.TimelineLoader.TimelineLoader;
Timeline.TimelineLoader.TransferChunkLengthBytes = TimelineModule.TimelineLoader.TransferChunkLengthBytes;
Timeline.TimelineLoader.Client = TimelineModule.TimelineLoader.Client;
Timeline.TimelineLoader.State = TimelineModule.TimelineLoader.State;
Timeline.TimelinePaintProfilerView = TimelineModule.TimelinePaintProfilerView.TimelinePaintProfilerView;
Timeline.TimelinePaintImageView = TimelineModule.TimelinePaintProfilerView.TimelinePaintImageView;
Timeline.TimelinePanel = TimelineModule.TimelinePanel.TimelinePanel;
Timeline.TimelinePanel.State = TimelineModule.TimelinePanel.State;
Timeline.TimelinePanel.ViewMode = TimelineModule.TimelinePanel.ViewMode;
Timeline.TimelinePanel.rowHeight = TimelineModule.TimelinePanel.rowHeight;
Timeline.TimelinePanel.headerHeight = TimelineModule.TimelinePanel.headerHeight;
Timeline.TimelinePanel.StatusPane = TimelineModule.TimelinePanel.StatusPane;
Timeline.TimelinePanel.ActionDelegate = TimelineModule.TimelinePanel.ActionDelegate;
Timeline.TimelineSelection = TimelineModule.TimelinePanel.TimelineSelection;
Timeline.TimelineModeViewDelegate = TimelineModule.TimelinePanel.TimelineModeViewDelegate;
Timeline.LoadTimelineHandler = TimelineModule.TimelinePanel.LoadTimelineHandler;
Timeline.TimelineTreeView = TimelineModule.TimelineTreeView.TimelineTreeView;
Timeline.TimelineTreeView.GridNode = TimelineModule.TimelineTreeView.GridNode;
Timeline.TimelineTreeView.TreeGridNode = TimelineModule.TimelineTreeView.TreeGridNode;
Timeline.AggregatedTimelineTreeView = TimelineModule.TimelineTreeView.AggregatedTimelineTreeView;
Timeline.CallTreeTimelineTreeView = TimelineModule.TimelineTreeView.CallTreeTimelineTreeView;
Timeline.BottomUpTimelineTreeView = TimelineModule.TimelineTreeView.BottomUpTimelineTreeView;
Timeline.TimelineStackView = TimelineModule.TimelineTreeView.TimelineStackView;
Timeline.TimelineUIUtils = TimelineModule.TimelineUIUtils.TimelineUIUtils;
Timeline.TimelineUIUtils.NetworkCategory = TimelineModule.TimelineUIUtils.NetworkCategory;
Timeline.TimelineUIUtils._aggregatedStatsKey = TimelineModule.TimelineUIUtils.aggregatedStatsKey;
Timeline.TimelineUIUtils.InvalidationsGroupElement = TimelineModule.TimelineUIUtils.InvalidationsGroupElement;
Timeline.TimelineUIUtils._previewElementSymbol = TimelineModule.TimelineUIUtils.previewElementSymbol;
Timeline.TimelineUIUtils.EventDispatchTypeDescriptor = TimelineModule.TimelineUIUtils.EventDispatchTypeDescriptor;
Timeline.TimelineUIUtils._categoryBreakdownCacheSymbol = TimelineModule.TimelineUIUtils.categoryBreakdownCacheSymbol;
Timeline.TimelineRecordStyle = TimelineModule.TimelineUIUtils.TimelineRecordStyle;
Timeline.TimelineCategory = TimelineModule.TimelineUIUtils.TimelineCategory;
Timeline.TimelineDetailsContentHelper = TimelineModule.TimelineUIUtils.TimelineDetailsContentHelper;
Timeline.UIDevtoolsController = TimelineModule.UIDevtoolsController.UIDevtoolsController;
Timeline.UIDevtoolsUtils = TimelineModule.UIDevtoolsUtils.UIDevtoolsUtils;
Timeline.UIDevtoolsUtils.RecordType = TimelineModule.UIDevtoolsUtils.RecordType;
//# sourceMappingURL=timeline-legacy.js.map
