import * as SDK from "../../../core/sdk/sdk.js";
import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import * as i18n from "../../../core/i18n/i18n.js";
import * as Host from "../../../core/host/host.js";
import * as IconButton from "../../../ui/components/icon_button/icon_button.js";
import * as ClientVariations from "../../../third_party/chromium/client-variations/client-variations.js";
import * as Platform from "../../../core/platform/platform.js";
import * as Buttons from "../../../ui/components/buttons/buttons.js";
import { EditableSpan } from "./EditableSpan.js";
import headerSectionRowStyles from "./HeaderSectionRow.css.js";
const { render, html } = LitHtml;
const UIStrings = {
  activeClientExperimentVariation: "Active `client experiment variation IDs`.",
  activeClientExperimentVariationIds: "Active `client experiment variation IDs` that trigger server-side behavior.",
  decoded: "Decoded:",
  editHeader: "Override header",
  headerNamesOnlyLetters: "Header names should contain only letters, digits, dashes or underscores",
  learnMore: "Learn more",
  learnMoreInTheIssuesTab: "Learn more in the issues tab",
  reloadPrompt: "Refresh the page/request for these changes to take effect",
  removeOverride: "Remove this header override"
};
const str_ = i18n.i18n.registerUIStrings("panels/network/components/HeaderSectionRow.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
const trashIconUrl = new URL("../../../Images/trash_bin_material_icon.svg", import.meta.url).toString();
const editIconUrl = new URL("../../../Images/edit-icon.svg", import.meta.url).toString();
export const isValidHeaderName = (headerName) => {
  return /^[a-z0-9_\-]+$/i.test(headerName);
};
export const compareHeaders = (first, second) => {
  return first?.replaceAll("\xA0", " ") === second?.replaceAll("\xA0", " ");
};
export class HeaderEditedEvent extends Event {
  static eventName = "headeredited";
  headerName;
  headerValue;
  constructor(headerName, headerValue) {
    super(HeaderEditedEvent.eventName, {});
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
}
export class HeaderRemovedEvent extends Event {
  static eventName = "headerremoved";
  headerName;
  headerValue;
  constructor(headerName, headerValue) {
    super(HeaderRemovedEvent.eventName, {});
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
}
export class EnableHeaderEditingEvent extends Event {
  static eventName = "enableheaderediting";
  constructor() {
    super(EnableHeaderEditingEvent.eventName, {});
  }
}
export class HeaderSectionRow extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-header-section-row`;
  #shadow = this.attachShadow({ mode: "open" });
  #header = null;
  #boundRender = this.#render.bind(this);
  #isHeaderValueEdited = false;
  #isValidHeaderName = true;
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [headerSectionRowStyles];
  }
  set data(data) {
    this.#header = data.header;
    this.#isHeaderValueEdited = this.#header.originalValue !== void 0 && this.#header.value !== this.#header.originalValue;
    this.#isValidHeaderName = isValidHeaderName(this.#header.name);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }
  #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("HeaderSectionRow render was not scheduled");
    }
    if (!this.#header) {
      return;
    }
    const rowClasses = LitHtml.Directives.classMap({
      row: true,
      "header-highlight": Boolean(this.#header.highlight),
      "header-overridden": Boolean(this.#header.isOverride) || this.#isHeaderValueEdited,
      "header-editable": Boolean(this.#header.valueEditable),
      "header-deleted": Boolean(this.#header.isDeleted)
    });
    const isHeaderNameEditable = this.#header.nameEditable && this.#header.valueEditable;
    const showReloadInfoIcon = this.#header.nameEditable || this.#header.isDeleted || this.#isHeaderValueEdited;
    render(html`
      <div class=${rowClasses}>
        <div class="header-name">
          ${this.#header.headerNotSet ? html`<div class="header-badge header-badge-text">${i18n.i18n.lockedString("not-set")}</div> ` : LitHtml.nothing}
          ${isHeaderNameEditable && !this.#isValidHeaderName ? html`<${IconButton.Icon.Icon.litTagName} class="inline-icon disallowed-characters" title=${UIStrings.headerNamesOnlyLetters} .data=${{
      iconName: "error_icon",
      width: "12px",
      height: "12px"
    }}>
            </${IconButton.Icon.Icon.litTagName}>` : LitHtml.nothing}
          ${isHeaderNameEditable && !this.#header.isDeleted ? html`<${EditableSpan.litTagName}
              @focusout=${this.#onHeaderNameFocusOut}
              @keydown=${this.#onKeyDown}
              @input=${this.#onHeaderNameEdit}
              @paste=${this.#onHeaderNameEdit}
              .data=${{ value: this.#header.name }}
            ></${EditableSpan.litTagName}>` : this.#header.name}:
        </div>
        <div
          class="header-value ${this.#header.headerValueIncorrect ? "header-warning" : ""}"
          @copy=${() => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >
          ${this.#renderHeaderValue()}
        </div>
        ${showReloadInfoIcon ? html`<${IconButton.Icon.Icon.litTagName} class="row-flex-icon flex-right" title=${UIStrings.reloadPrompt} .data=${{
      iconName: "info-icon",
      width: "12px",
      height: "12px"
    }}>
          </${IconButton.Icon.Icon.litTagName}>` : LitHtml.nothing}
      </div>
      ${this.#maybeRenderBlockedDetails(this.#header.blockedDetails)}
    `, this.#shadow, { host: this });
  }
  #renderHeaderValue() {
    if (!this.#header) {
      return LitHtml.nothing;
    }
    if (this.#header.isDeleted || !this.#header.valueEditable) {
      return html`
      ${this.#header.value || ""}
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      ${this.#header.isResponseHeader && !this.#header.isDeleted ? html`
        <${Buttons.Button.Button.litTagName}
          title=${i18nString(UIStrings.editHeader)}
          .size=${Buttons.Button.Size.TINY}
          .iconUrl=${editIconUrl}
          .variant=${Buttons.Button.Variant.ROUND}
          .iconWidth=${"13px"}
          .iconHeight=${"13px"}
          @click=${() => {
        this.dispatchEvent(new EnableHeaderEditingEvent());
      }}
          class="enable-editing inline-button"
        ></${Buttons.Button.Button.litTagName}>
      ` : LitHtml.nothing}
    `;
    }
    return html`
      <${EditableSpan.litTagName}
        @focusout=${this.#onHeaderValueFocusOut}
        @input=${this.#onHeaderValueEdit}
        @paste=${this.#onHeaderValueEdit}
        @keydown=${this.#onKeyDown}
        .data=${{ value: this.#header.value || "" }}
      ></${EditableSpan.litTagName}>
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      <${Buttons.Button.Button.litTagName}
        title=${i18nString(UIStrings.removeOverride)}
        .size=${Buttons.Button.Size.TINY}
        .iconUrl=${trashIconUrl}
        .variant=${Buttons.Button.Variant.ROUND}
        .iconWidth=${"13px"}
        .iconHeight=${"13px"}
        class="remove-header inline-button"
        @click=${this.#onRemoveOverrideClick}
      ></${Buttons.Button.Button.litTagName}>
    `;
  }
  focus() {
    requestAnimationFrame(() => {
      const editableName = this.#shadow.querySelector(".header-name devtools-editable-span");
      editableName?.focus();
    });
  }
  #maybeRenderHeaderValueSuffix(header) {
    if (header.name === "set-cookie" && header.setCookieBlockedReasons) {
      const titleText = header.setCookieBlockedReasons.map(SDK.NetworkRequest.setCookieBlockedReasonToUiString).join("\n");
      return html`
        <${IconButton.Icon.Icon.litTagName} class="row-flex-icon" title=${titleText} .data=${{
        iconName: "clear-warning_icon",
        width: "12px",
        height: "12px"
      }}>
        </${IconButton.Icon.Icon.litTagName}>
      `;
    }
    if (header.name === "x-client-data") {
      const data = ClientVariations.parseClientVariations(header.value || "");
      const output = ClientVariations.formatClientVariations(data, i18nString(UIStrings.activeClientExperimentVariation), i18nString(UIStrings.activeClientExperimentVariationIds));
      return html`
        <div>${i18nString(UIStrings.decoded)}</div>
        <code>${output}</code>
      `;
    }
    return LitHtml.nothing;
  }
  #maybeRenderBlockedDetails(blockedDetails) {
    if (!blockedDetails) {
      return LitHtml.nothing;
    }
    return html`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation">${blockedDetails.explanation()}</div>
          ${blockedDetails.examples.map((example) => html`
            <div class="example">
              <code>${example.codeSnippet}</code>
              ${example.comment ? html`
                <span class="comment">${example.comment()}</span>
              ` : ""}
            </div>
          `)}
          ${this.#maybeRenderBlockedDetailsLink(blockedDetails)}
        </div>
      </div>
    `;
  }
  #maybeRenderBlockedDetailsLink(blockedDetails) {
    if (blockedDetails?.reveal) {
      return html`
        <div class="devtools-link" @click=${blockedDetails.reveal}>
          <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
        iconName: "issue-exclamation-icon",
        color: "var(--issue-color-yellow)",
        width: "16px",
        height: "16px"
      }}>
          </${IconButton.Icon.Icon.litTagName}
          >${i18nString(UIStrings.learnMoreInTheIssuesTab)}
        </div>
      `;
    }
    if (blockedDetails?.link) {
      return html`
        <x-link href=${blockedDetails.link.url} class="link">
          <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
        iconName: "link_icon",
        color: "var(--color-link)",
        width: "16px",
        height: "16px"
      }}>
          </${IconButton.Icon.Icon.litTagName}
          >${i18nString(UIStrings.learnMore)}
        </x-link>
      `;
    }
    return LitHtml.nothing;
  }
  #onHeaderValueFocusOut(event) {
    const target = event.target;
    if (!this.#header) {
      return;
    }
    const headerValue = target.value.trim();
    if (!compareHeaders(headerValue, this.#header.value?.trim())) {
      this.#header.value = headerValue;
      this.dispatchEvent(new HeaderEditedEvent(this.#header.name, headerValue));
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }
  #onHeaderNameFocusOut(event) {
    const target = event.target;
    if (!this.#header) {
      return;
    }
    const headerName = Platform.StringUtilities.toLowerCaseString(target.value.trim());
    if (headerName === "") {
      target.value = this.#header.name;
    } else if (!compareHeaders(headerName, this.#header.name.trim())) {
      this.#header.name = headerName;
      this.dispatchEvent(new HeaderEditedEvent(headerName, this.#header.value || ""));
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }
  #onRemoveOverrideClick() {
    if (!this.#header) {
      return;
    }
    const headerValueElement = this.#shadow.querySelector(".header-value devtools-editable-span");
    if (this.#header.originalValue) {
      headerValueElement.value = this.#header?.originalValue;
    }
    this.dispatchEvent(new HeaderRemovedEvent(this.#header.name, this.#header.value || ""));
  }
  #onKeyDown(event) {
    const keyboardEvent = event;
    const target = event.target;
    if (keyboardEvent.key === "Escape") {
      event.consume();
      if (target.matches(".header-name devtools-editable-span")) {
        target.value = this.#header?.name || "";
        this.#onHeaderNameEdit(event);
      } else if (target.matches(".header-value devtools-editable-span")) {
        target.value = this.#header?.value || "";
        this.#onHeaderValueEdit(event);
      }
      target.blur();
    }
  }
  #onHeaderNameEdit(event) {
    const editable = event.target;
    const isValidName = isValidHeaderName(editable.value);
    if (this.#isValidHeaderName !== isValidName) {
      this.#isValidHeaderName = isValidName;
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
  }
  #onHeaderValueEdit(event) {
    const editable = event.target;
    const isEdited = this.#header?.originalValue !== void 0 && this.#header?.originalValue !== editable.value;
    if (this.#isHeaderValueEdited !== isEdited) {
      this.#isHeaderValueEdited = isEdited;
      if (this.#header) {
        this.#header.highlight = false;
      }
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-header-section-row", HeaderSectionRow);
//# sourceMappingURL=HeaderSectionRow.js.map
