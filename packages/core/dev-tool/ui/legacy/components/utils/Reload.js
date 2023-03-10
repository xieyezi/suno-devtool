import * as Host from "../../../../core/host/host.js";
import * as UI from "../../legacy.js";
export function reload() {
  if (UI.DockController.DockController.instance().canDock() && UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.UNDOCKED) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {
    });
  }
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
}
//# sourceMappingURL=Reload.js.map
