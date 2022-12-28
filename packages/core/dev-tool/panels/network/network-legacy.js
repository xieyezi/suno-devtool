import * as NetworkForwardModule from "./forward/forward.js";
import * as NetworkModule from "./network.js";
self.Network = self.Network || {};
Network = Network || {};
Network.BinaryResourceView = NetworkModule.BinaryResourceView.BinaryResourceView;
Network.BlockedURLsPane = NetworkModule.BlockedURLsPane.BlockedURLsPane;
Network.EventSourceMessageNode = NetworkModule.EventSourceMessagesView.EventSourceMessageNode;
Network.NetworkConfigView = NetworkModule.NetworkConfigView.NetworkConfigView;
Network.NetworkConfigView._userAgentGroups = NetworkModule.NetworkConfigView.userAgentGroups;
Network.NetworkNode = NetworkModule.NetworkDataGridNode.NetworkNode;
Network.NetworkItemView = NetworkModule.NetworkItemView.NetworkItemView;
Network.NetworkLogView = NetworkModule.NetworkLogView.NetworkLogView;
Network.NetworkLogView.isRequestFilteredOut = NetworkModule.NetworkLogView.isRequestFilteredOut;
Network.NetworkLogView.HTTPRequestsFilter = NetworkModule.NetworkLogView.NetworkLogView.getHTTPRequestsFilter;
Network.NetworkLogView.FilterType = NetworkForwardModule.UIFilter.FilterType;
Network.NetworkLogViewColumns = NetworkModule.NetworkLogViewColumns.NetworkLogViewColumns;
Network.NetworkOverview = NetworkModule.NetworkOverview.NetworkOverview;
Network.NetworkPanel = NetworkModule.NetworkPanel.NetworkPanel;
Network.SearchNetworkView = NetworkModule.NetworkPanel.SearchNetworkView;
Network.NetworkPanel.ContextMenuProvider = NetworkModule.NetworkPanel.ContextMenuProvider;
Network.NetworkPanel.RequestRevealer = NetworkModule.NetworkPanel.RequestRevealer;
Network.NetworkPanel.ActionDelegate = NetworkModule.NetworkPanel.ActionDelegate;
Network.NetworkTimeCalculator = NetworkModule.NetworkTimeCalculator.NetworkTimeCalculator;
Network.NetworkWaterfallColumn = NetworkModule.NetworkWaterfallColumn.NetworkWaterfallColumn;
Network.RequestHTMLView = NetworkModule.RequestHTMLView.RequestHTMLView;
Network.RequestHeadersView = NetworkModule.RequestHeadersView.RequestHeadersView;
Network.RequestPayloadView = NetworkModule.RequestPayloadView.RequestPayloadView;
Network.RequestPreviewView = NetworkModule.RequestPreviewView.RequestPreviewView;
Network.RequestResponseView = NetworkModule.RequestResponseView.RequestResponseView;
Network.RequestTimingView = NetworkModule.RequestTimingView.RequestTimingView;
Network.RequestTimeRangeNames = NetworkModule.RequestTimingView.RequestTimeRangeNames;
Network.ResourceWebSocketFrameView = NetworkModule.ResourceWebSocketFrameView.ResourceWebSocketFrameView;
Network.ResourceWebSocketFrameNode = NetworkModule.ResourceWebSocketFrameView.ResourceWebSocketFrameNode;
Network.SignedExchangeInfoView = NetworkModule.SignedExchangeInfoView.SignedExchangeInfoView;
//# sourceMappingURL=network-legacy.js.map
