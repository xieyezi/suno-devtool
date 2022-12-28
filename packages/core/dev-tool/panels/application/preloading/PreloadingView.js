import * as i18n from "../../../core/i18n/i18n.js";
import * as UI from "../../../ui/legacy/legacy.js";
import * as SDK from "../../../core/sdk/sdk.js";
import * as PreloadingComponents from "./components/components.js";
import emptyWidgetStyles from "../../../ui/legacy/emptyWidget.css.js";
import preloadingViewStyles from "./preloadingView.css.js";
const UIStrings = {
  clearNotOngoing: "Clear not ongoing",
  statusPrerendering: "Prerendering",
  statusActivated: "Activated",
  statusDiscarded: "Discarded"
};
const str_ = i18n.i18n.registerUIStrings("panels/application/preloading/PreloadingView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
class PrerenderingUIUtils {
  static trigger(x) {
    switch (x.trigger.kind) {
      case "PrerenderingTriggerSpecRules":
        return i18n.i18n.lockedString("Speculation Rules");
      case "PrerenderingTriggerDUI":
        return i18n.i18n.lockedString("Direct User Input");
      case "PrerenderingTriggerDSE":
        return i18n.i18n.lockedString("Default Search Engine");
      case "PrerenderingTriggerOpaque":
        return i18n.i18n.lockedString("Opaque");
    }
  }
  static status(x) {
    switch (x.status) {
      case SDK.PrerenderingModel.PrerenderingStatus.Prerendering:
        return i18nString(UIStrings.statusPrerendering);
      case SDK.PrerenderingModel.PrerenderingStatus.Activated:
        return i18nString(UIStrings.statusActivated);
      case SDK.PrerenderingModel.PrerenderingStatus.Discarded:
        return i18nString(UIStrings.statusDiscarded);
    }
  }
}
export class PreloadingView extends UI.Widget.VBox {
  model;
  focused = null;
  toolbar;
  splitWidget;
  grid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  bottomContainer;
  details = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  constructor(model) {
    super(true, false);
    this.model = model;
    this.model.addEventListener(SDK.PrerenderingModel.Events.PrerenderingAttemptStarted, this.onModelUpdated, this);
    this.model.addEventListener(SDK.PrerenderingModel.Events.PrerenderingAttemptUpdated, this.onModelUpdated, this);
    this.model.addEventListener(SDK.PrerenderingModel.Events.PrerenderingAttemptsRemoved, this.onModelUpdated, this);
    this.toolbar = new UI.Toolbar.Toolbar("preloading-toolbar", this.contentElement);
    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearNotOngoing), "largeicon-clear");
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.onClearNotOngoing, this);
    this.toolbar.appendToolbarItem(clearButton);
    this.toolbar.appendSeparator();
    const topContainer = new UI.Widget.VBox();
    topContainer.setMinimumSize(0, 40);
    this.bottomContainer = new UI.Widget.VBox();
    this.bottomContainer.setMinimumSize(0, 80);
    this.splitWidget = new UI.SplitWidget.SplitWidget(false, true, void 0, void 0, 500, void 0);
    this.splitWidget.setMainWidget(topContainer);
    this.splitWidget.setSidebarWidget(this.bottomContainer);
    this.grid.addEventListener("cellfocused", this.onCellFocused.bind(this));
    topContainer.contentElement.appendChild(this.grid);
    this.bottomContainer.contentElement.appendChild(this.details);
  }
  wasShown() {
    super.wasShown();
    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);
    this.splitWidget.show(this.contentElement);
    this.onModelUpdated();
  }
  updateDetails() {
    this.details.data = this.focused === null ? null : this.model.getById(this.focused);
  }
  onModelUpdated() {
    const rows = this.model.getAll().map(({ id, attempt }) => {
      return {
        id,
        startedAt: new Date(attempt.startedAt).toLocaleString(),
        type: i18n.i18n.lockedString("Prerendering"),
        trigger: PrerenderingUIUtils.trigger(attempt),
        url: attempt.url,
        status: PrerenderingUIUtils.status(attempt)
      };
    });
    this.grid.update(rows);
    this.updateDetails();
  }
  onCellFocused(event) {
    const focusedEvent = event;
    this.focused = focusedEvent.data.row.cells.find((cell) => cell.columnId === "id")?.value;
    this.updateDetails();
  }
  onClearNotOngoing() {
    this.model.clearNotOngoing();
  }
  getGridForTest() {
    return this.grid;
  }
  getDetailsForTest() {
    return this.details;
  }
}
//# sourceMappingURL=PreloadingView.js.map
