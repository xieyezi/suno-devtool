import * as i18n from "../../../core/i18n/i18n.js";
import * as DataGrid from "../../../ui/components/data_grid/data_grid.js";
import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as IconButton from "../../../ui/components/icon_button/icon_button.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import sharedStorageAccessGridStyles from "./sharedStorageAccessGrid.css.js";
const UIStrings = {
  sharedStorage: "Shared Storage",
  allSharedStorageEvents: "All shared storage events for this page.",
  eventTime: "Event Time",
  eventType: "Access Type",
  mainFrameId: "Main Frame ID",
  ownerOrigin: "Owner Origin",
  eventParams: "Optional Event Params",
  noEvents: "No shared storage events recorded."
};
const str_ = i18n.i18n.registerUIStrings("panels/application/components/SharedStorageAccessGrid.ts", UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class SharedStorageAccessGrid extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-shared-storage-access-grid`;
  #shadow = this.attachShadow({ mode: "open" });
  #datastores = [];
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [sharedStorageAccessGridStyles];
    this.#render();
  }
  set data(data) {
    this.#datastores = data;
    this.#render();
  }
  #render() {
    LitHtml.render(LitHtml.html`
      <div>
        <span class="heading">${i18nString(UIStrings.sharedStorage)}</span>
        <${IconButton.Icon.Icon.litTagName} class="info-icon" title=${i18nString(UIStrings.allSharedStorageEvents)}
          .data=${{
      iconName: "ic_info_black_18dp",
      color: "var(--color-link)",
      width: "14px"
    }}>
        </${IconButton.Icon.Icon.litTagName}>
        ${this.#renderGridOrNoDataMessage()}
      </div>
    `, this.#shadow, { host: this });
  }
  #renderGridOrNoDataMessage() {
    if (this.#datastores.length === 0) {
      return LitHtml.html`<div
        class="no-events-message">${i18nString(UIStrings.noEvents)}</div>`;
    }
    const gridData = {
      columns: [
        {
          id: "event-main-frame-id",
          title: i18nString(UIStrings.mainFrameId),
          widthWeighting: 10,
          hideable: false,
          visible: false,
          sortable: false
        },
        {
          id: "event-time",
          title: i18nString(UIStrings.eventTime),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true
        },
        {
          id: "event-type",
          title: i18nString(UIStrings.eventType),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true
        },
        {
          id: "event-owner-origin",
          title: i18nString(UIStrings.ownerOrigin),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true
        },
        {
          id: "event-params",
          title: i18nString(UIStrings.eventParams),
          widthWeighting: 10,
          hideable: false,
          visible: true,
          sortable: true
        }
      ],
      rows: this.#buildRows(),
      initialSort: {
        columnId: "event-time",
        direction: DataGrid.DataGridUtils.SortDirection.ASC
      }
    };
    return LitHtml.html`
      <${DataGrid.DataGridController.DataGridController.litTagName} .data=${gridData}></${DataGrid.DataGridController.DataGridController.litTagName}>
    `;
  }
  #buildRows() {
    return this.#datastores.map((event) => ({
      cells: [
        { columnId: "event-main-frame-id", value: event.mainFrameId },
        {
          columnId: "event-time",
          value: event.accessTime,
          renderer: this.#renderDateForDataGridCell.bind(this)
        },
        { columnId: "event-type", value: event.type },
        { columnId: "event-owner-origin", value: event.ownerOrigin },
        { columnId: "event-params", value: JSON.stringify(event.params) }
      ]
    }));
  }
  #renderDateForDataGridCell(value) {
    const date = new Date(1e3 * value);
    return LitHtml.html`${date.toLocaleString()}`;
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-shared-storage-access-grid", SharedStorageAccessGrid);
//# sourceMappingURL=SharedStorageAccessGrid.js.map
