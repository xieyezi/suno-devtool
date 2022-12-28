import * as SDK from "../../core/sdk/sdk.js";
import * as UI from "../../ui/legacy/legacy.js";
import { ReportingApiReportsView } from "./ReportingApiReportsView.js";
export class ReportingApiView extends UI.SplitWidget.SplitWidget {
  endpointsGrid;
  endpoints;
  constructor(endpointsGrid) {
    super(false, true);
    this.endpointsGrid = endpointsGrid;
    this.endpoints = /* @__PURE__ */ new Map();
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
    const networkManager = mainTarget && mainTarget.model(SDK.NetworkManager.NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, (event) => this.onEndpointsChangedForOrigin(event.data), this);
      const reportingApiReportsView = new ReportingApiReportsView(networkManager);
      const reportingApiEndpointsView = new UI.Widget.VBox();
      reportingApiEndpointsView.setMinimumSize(0, 40);
      reportingApiEndpointsView.contentElement.appendChild(this.endpointsGrid);
      this.setMainWidget(reportingApiReportsView);
      this.setSidebarWidget(reportingApiEndpointsView);
      void networkManager.enableReportingApi();
    }
  }
  onEndpointsChangedForOrigin(data) {
    this.endpoints.set(data.origin, data.endpoints);
    this.endpointsGrid.data = { endpoints: this.endpoints };
  }
}
//# sourceMappingURL=ReportingApiView.js.map
