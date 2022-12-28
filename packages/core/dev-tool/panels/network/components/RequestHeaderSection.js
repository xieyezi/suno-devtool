import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import * as i18n from "../../../core/i18n/i18n.js";
import * as NetworkForward from "../forward/forward.js";
import * as IconButton from "../../../ui/components/icon_button/icon_button.js";
import * as Platform from "../../../core/platform/platform.js";
import { HeaderSectionRow } from "./HeaderSectionRow.js";
import requestHeaderSectionStyles from "./RequestHeaderSection.css.js";
const { render, html } = LitHtml;
const UIStrings = {
  learnMore: "Learn more",
  provisionalHeadersAreShownDisableCache: "Provisional headers are shown. Disable cache to see full headers.",
  onlyProvisionalHeadersAre: "Only provisional headers are available because this request was not sent over the network and instead was served from a local cache, which doesn\u2019t store the original request headers. Disable cache to see full request headers.",
  provisionalHeadersAreShown: "Provisional headers are shown."
};
const str_ = i18n.i18n.registerUIStrings("panels/network/components/RequestHeaderSection.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class RequestHeaderSection extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-request-header-section`;
  #shadow = this.attachShadow({ mode: "open" });
  #request;
  #headers = [];
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [requestHeaderSectionStyles];
  }
  set data(data) {
    this.#request = data.request;
    this.#headers = this.#request.requestHeaders().map((header) => ({
      name: Platform.StringUtilities.toLowerCaseString(header.name),
      value: header.value
    }));
    this.#headers.sort((a, b) => Platform.StringUtilities.compare(a.name, b.name));
    if (data.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Request) {
      this.#headers.filter((header) => header.name === data.toReveal?.header?.toLowerCase()).forEach((header) => {
        header.highlight = true;
      });
    }
    this.#render();
  }
  #render() {
    if (!this.#request) {
      return;
    }
    render(html`
      ${this.#maybeRenderProvisionalHeadersWarning()}
      ${this.#headers.map((header) => html`
        <${HeaderSectionRow.litTagName} .data=${{
      header
    }}></${HeaderSectionRow.litTagName}>
      `)}
    `, this.#shadow, { host: this });
  }
  #maybeRenderProvisionalHeadersWarning() {
    if (!this.#request || this.#request.requestHeadersText() !== void 0) {
      return LitHtml.nothing;
    }
    let cautionText;
    let cautionTitle = "";
    if (this.#request.cachedInMemory() || this.#request.cached()) {
      cautionText = i18nString(UIStrings.provisionalHeadersAreShownDisableCache);
      cautionTitle = i18nString(UIStrings.onlyProvisionalHeadersAre);
    } else {
      cautionText = i18nString(UIStrings.provisionalHeadersAreShown);
    }
    return html`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation" title=${cautionTitle}>
            <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
      iconName: "clear-warning_icon",
      width: "12px",
      height: "12px"
    }}>
            </${IconButton.Icon.Icon.litTagName}>
            ${cautionText} <x-link href="https://developer.chrome.com/docs/devtools/network/reference/#provisional-headers" class="link">${i18nString(UIStrings.learnMore)}</x-link>
          </div>
        </div>
      </div>
    `;
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-request-header-section", RequestHeaderSection);
//# sourceMappingURL=RequestHeaderSection.js.map
