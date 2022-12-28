import * as i18n from "../../../core/i18n/i18n.js";
import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as Coordinator from "../../../ui/components/render_coordinator/render_coordinator.js";
import * as ReportView from "../../../ui/components/report_view/report_view.js";
import * as UI from "../../../ui/legacy/legacy.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import * as IconButton from "../../../ui/components/icon_button/icon_button.js";
import sharedStorageMetadataViewStyles from "./sharedStorageMetadataView.css.js";
const UIStrings = {
  sharedStorage: "Shared Storage",
  metadata: "Metadata",
  origin: "Origin",
  creation: "Creation Time",
  notYetCreated: "Not yet created",
  numEntries: "Number of Entries",
  entropyBudget: "Entropy Budget for Fenced Frames",
  budgetExplanation: "Remaining data leakage allowed within a 24-hour period for this origin in bits of entropy",
  entries: "Entries"
};
const str_ = i18n.i18n.registerUIStrings("panels/application/components/SharedStorageMetadataView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class SharedStorageMetadataView extends UI.Widget.VBox {
  #reportView = new SharedStorageMetadataReportView();
  #sharedStorageMetadataGetter;
  constructor(sharedStorageMetadataGetter, owner) {
    super();
    this.#sharedStorageMetadataGetter = sharedStorageMetadataGetter;
    this.contentElement.classList.add("overflow-auto");
    this.contentElement.appendChild(this.#reportView);
    this.#reportView.origin = owner;
    void this.doUpdate();
  }
  async doUpdate() {
    const metadata = await this.#sharedStorageMetadataGetter.getMetadata();
    const creationTime = metadata?.creationTime ?? null;
    const length = metadata?.length ?? 0;
    const remainingBudget = metadata?.remainingBudget ?? 0;
    this.#reportView.data = { creationTime, length, remainingBudget };
  }
}
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
export class SharedStorageMetadataReportView extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-shared-storage-metadata-view`;
  #shadow = this.attachShadow({ mode: "open" });
  #origin = "";
  #creationTime = null;
  #length = 0;
  #remainingBudget = 0;
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [sharedStorageMetadataViewStyles];
  }
  set data(data) {
    if (data.creationTime) {
      this.#creationTime = data.creationTime;
      this.#length = data.length;
      this.#remainingBudget = data.remainingBudget;
    }
    void this.#render();
  }
  set origin(origin) {
    this.#origin = origin;
  }
  async #render() {
    await coordinator.write("SharedStorageMetadataView render", () => {
      const titleForReport = { reportTitle: i18nString(UIStrings.sharedStorage) };
      LitHtml.render(LitHtml.html`
        <${ReportView.ReportView.Report.litTagName} .data=${titleForReport}>
          ${this.#renderMetadataSection()}
          ${this.#renderEntriesSection()}
        </${ReportView.ReportView.Report.litTagName}>
      `, this.#shadow, { host: this });
    });
  }
  #renderMetadataSection() {
    return LitHtml.html`
      <${ReportView.ReportView.ReportSectionHeader.litTagName}>${i18nString(UIStrings.metadata)}</${ReportView.ReportView.ReportSectionHeader.litTagName}>
      <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.origin)}</${ReportView.ReportView.ReportKey.litTagName}>
      <${ReportView.ReportView.ReportValue.litTagName}>
          <div class="text-ellipsis" title=${this.#origin}>${this.#origin}</div>
      </${ReportView.ReportView.ReportValue.litTagName}>
     <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.creation)}</${ReportView.ReportView.ReportKey.litTagName}>
     <${ReportView.ReportView.ReportValue.litTagName}>
     ${this.#renderDateForCreationTime()}</${ReportView.ReportView.ReportValue.litTagName}>
     <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.numEntries)}
     </${ReportView.ReportView.ReportKey.litTagName}>
     <${ReportView.ReportView.ReportValue.litTagName}>${this.#length}</${ReportView.ReportView.ReportValue.litTagName}>
     <${ReportView.ReportView.ReportKey.litTagName}>${i18nString(UIStrings.entropyBudget)}<${IconButton.Icon.Icon.litTagName} class="info-icon" title=${i18nString(UIStrings.budgetExplanation)}
          .data=${{ iconName: "ic_info_black_18dp", color: "var(--color-link)", width: "14px" }}>
        </${IconButton.Icon.Icon.litTagName}></${ReportView.ReportView.ReportKey.litTagName}><${ReportView.ReportView.ReportValue.litTagName}>${this.#remainingBudget}</${ReportView.ReportView.ReportValue.litTagName}>
      <${ReportView.ReportView.ReportSectionDivider.litTagName}></${ReportView.ReportView.ReportSectionDivider.litTagName}>
    `;
  }
  #renderDateForCreationTime() {
    if (!this.#creationTime) {
      return LitHtml.html`${i18nString(UIStrings.notYetCreated)}`;
    }
    const date = new Date(1e3 * this.#creationTime);
    return LitHtml.html`${date.toLocaleString()}`;
  }
  #renderEntriesSection() {
    return LitHtml.html`
      <${ReportView.ReportView.ReportSectionHeader.litTagName} title=${i18nString(UIStrings.entries)}>
        ${i18nString(UIStrings.entries)}</${ReportView.ReportView.ReportSectionHeader.litTagName}>
    `;
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-shared-storage-metadata-view", SharedStorageMetadataReportView);
//# sourceMappingURL=SharedStorageMetadataView.js.map
