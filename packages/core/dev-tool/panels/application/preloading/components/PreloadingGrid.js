import * as i18n from "../../../../core/i18n/i18n.js";
import * as DataGrid from "../../../../ui/components/data_grid/data_grid.js";
import * as ComponentHelpers from "../../../../ui/components/helpers/helpers.js";
import * as LitHtml from "../../../../ui/lit-html/lit-html.js";
import preloadingGridStyles from "./preloadingGrid.css.js";
const UIStrings = {
  startedAt: "Started at",
  type: "Type",
  trigger: "Trigger",
  status: "Status"
};
const str_ = i18n.i18n.registerUIStrings("panels/application/preloading/components/PreloadingGrid.ts", UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
const { render, html } = LitHtml;
export class PreloadingGrid extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-resources-preloading-grid`;
  #shadow = this.attachShadow({ mode: "open" });
  #rows = [];
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [preloadingGridStyles];
    this.#render();
  }
  update(rows) {
    this.#rows = rows;
    this.#render();
  }
  #render() {
    const reportsGridData = {
      columns: [
        {
          id: "startedAt",
          title: i18nString(UIStrings.startedAt),
          widthWeighting: 20,
          hideable: false,
          visible: true
        },
        {
          id: "type",
          title: i18nString(UIStrings.type),
          widthWeighting: 10,
          hideable: false,
          visible: true
        },
        {
          id: "trigger",
          title: i18nString(UIStrings.trigger),
          widthWeighting: 10,
          hideable: false,
          visible: true
        },
        {
          id: "url",
          title: i18n.i18n.lockedString("URL"),
          widthWeighting: 40,
          hideable: false,
          visible: true
        },
        {
          id: "status",
          title: i18nString(UIStrings.status),
          widthWeighting: 20,
          hideable: false,
          visible: true
        }
      ],
      rows: this.#buildReportRows()
    };
    render(html`
      <div class="preloading-container">
        <${DataGrid.DataGridController.DataGridController.litTagName} .data=${reportsGridData}>
        </${DataGrid.DataGridController.DataGridController.litTagName}>
      </div>
    `, this.#shadow, { host: this });
  }
  #buildReportRows() {
    return this.#rows.map((row) => ({
      cells: [
        { columnId: "id", value: row.id },
        { columnId: "type", value: row.type },
        { columnId: "startedAt", value: row.startedAt },
        { columnId: "trigger", value: row.trigger },
        { columnId: "url", value: row.url },
        { columnId: "status", value: row.status }
      ]
    }));
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-resources-preloading-grid", PreloadingGrid);
//# sourceMappingURL=PreloadingGrid.js.map
