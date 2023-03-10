import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as MobileThrottling from "../../panels/mobile_throttling/mobile_throttling.js";
import * as Components from "../../ui/legacy/components/utils/utils.js";
const UIStrings = {
  main: "Main"
};
const str_ = i18n.i18n.registerUIStrings("entrypoints/worker_app/WorkerMain.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
let workerMainImplInstance;
export class WorkerMainImpl {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!workerMainImplInstance || forceNew) {
      workerMainImplInstance = new WorkerMainImpl();
    }
    return workerMainImplInstance;
  }
  async run() {
    void SDK.Connections.initMainConnection(async () => {
      if (await SDK.TargetManager.TargetManager.instance().maybeAttachInitialTarget()) {
        return;
      }
      SDK.TargetManager.TargetManager.instance().createTarget("main", i18nString(UIStrings.main), SDK.Target.Type.ServiceWorker, null);
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
    new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();
  }
}
Common.Runnable.registerEarlyInitializationRunnable(WorkerMainImpl.instance);
SDK.ChildTargetManager.ChildTargetManager.install(async ({ target, waitingForDebugger }) => {
  if (target.parentTarget() || target.type() !== SDK.Target.Type.ServiceWorker || !waitingForDebugger) {
    return;
  }
  const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  if (!debuggerModel) {
    return;
  }
  if (!debuggerModel.isReadyToPause()) {
    await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
  }
  debuggerModel.pause();
});
//# sourceMappingURL=WorkerMain.js.map
