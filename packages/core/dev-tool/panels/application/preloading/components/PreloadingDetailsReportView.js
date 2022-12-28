import * as i18n from "../../../../core/i18n/i18n.js";
import * as SDK from "../../../../core/sdk/sdk.js";
import * as ComponentHelpers from "../../../../ui/components/helpers/helpers.js";
import * as Coordinator from "../../../../ui/components/render_coordinator/render_coordinator.js";
import * as ReportView from "../../../../ui/components/report_view/report_view.js";
import * as LitHtml from "../../../../ui/lit-html/lit-html.js";
import preloadingDetailsReportViewStyles from "./preloadingDetailsReportView.css.js";
const UIStrings = {
  selectAnElementForMoreDetails: "Select an element for more details",
  statusPrerendering: "Prerendering",
  statusActivated: "Activated",
  statusDiscarded: "Discarded",
  detailsBasicInformation: "Basic information",
  detailsStartedAt: "Started at",
  detailsTrigger: "Trigger",
  detailsStatus: "Status"
};
const str_ = i18n.i18n.registerUIStrings("panels/application/preloading/components/PreloadingDetailsReportView.ts", UIStrings);
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
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
export class PreloadingDetailsReportView extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-resources-preloading-details-report-view`;
  #shadow = this.attachShadow({ mode: "open" });
  #data = null;
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [preloadingDetailsReportViewStyles];
  }
  set data(data) {
    this.#data = data;
    void this.#render();
  }
  async #render() {
    await coordinator.write("PreloadingDetailsReportView render", () => {
      if (this.#data === null) {
        LitHtml.render(LitHtml.html`
          <div class="preloading-noselected">
            <div>
              <p>${i18nString(UIStrings.selectAnElementForMoreDetails)}</p>
            </div>
          </div>
        `, this.#shadow, { host: this });
        return;
      }
      const startedAt = new Date(this.#data.startedAt).toLocaleString();
      const trigger = PrerenderingUIUtils.trigger(this.#data);
      const status = PrerenderingUIUtils.status(this.#data);
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${{ reportTitle: "Prerendering Attempt" }}>
          <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.detailsBasicInformation)}</${ReportView.ReportView.ReportSectionHeader.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18n.i18n.lockedString("URL")}</${ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title=${this.#data.url}>${this.#data.url}</div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsStartedAt)}</${ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${startedAt}
            </div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsTrigger)}</${ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            <div class="text-ellipsis" title="">
              ${trigger}
            </div>
          </${ReportView.ReportView.ReportValue.litTagName}>

          <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.detailsStatus)}</${ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            ${status}
          </${ReportView.ReportView.ReportValue.litTagName}>

          ${this.#maybeDiscardedReason()}
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, { host: this });
    });
  }
  #maybeDiscardedReason() {
    if (!this.#data) {
      return LitHtml.nothing;
    }
    if (this.#data.discardedReason === null || this.#data.discardedReason === void 0) {
      return LitHtml.nothing;
    }
    return LitHtml.html`
          <${ReportView.ReportView.ReportKey.litTagName}>${i18n.i18n.lockedString("Discarded reason")}</${ReportView.ReportView.ReportKey.litTagName}>
          <${ReportView.ReportView.ReportValue.litTagName}>
            ${this.#data.discardedReason}
          </${ReportView.ReportView.ReportValue.litTagName}>
    `;
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-resources-preloading-details-report-view", PreloadingDetailsReportView);
//# sourceMappingURL=PreloadingDetailsReportView.js.map
