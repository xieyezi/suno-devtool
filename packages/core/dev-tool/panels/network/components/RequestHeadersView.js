import * as Common from "../../../core/common/common.js";
import * as Host from "../../../core/host/host.js";
import * as i18n from "../../../core/i18n/i18n.js";
import * as Platform from "../../../core/platform/platform.js";
import * as Root from "../../../core/root/root.js";
import * as SDK from "../../../core/sdk/sdk.js";
import * as Persistence from "../../../models/persistence/persistence.js";
import * as Workspace from "../../../models/workspace/workspace.js";
import * as NetworkForward from "../../../panels/network/forward/forward.js";
import * as Buttons from "../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as IconButton from "../../../ui/components/icon_button/icon_button.js";
import * as Input from "../../../ui/components/input/input.js";
import * as UI from "../../../ui/legacy/legacy.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import * as Sources from "../../sources/sources.js";
import { RequestHeaderSection } from "./RequestHeaderSection.js";
import {
  ResponseHeaderSection,
  RESPONSE_HEADER_SECTION_DATA_KEY
} from "./ResponseHeaderSection.js";
import requestHeadersViewStyles from "./RequestHeadersView.css.js";
const RAW_HEADER_CUTOFF = 3e3;
const { render, html } = LitHtml;
const UIStrings = {
  fromDiskCache: "(from disk cache)",
  fromMemoryCache: "(from memory cache)",
  fromPrefetchCache: "(from prefetch cache)",
  fromServiceWorker: "(from `service worker`)",
  fromSignedexchange: "(from signed-exchange)",
  fromWebBundle: "(from Web Bundle)",
  general: "General",
  headerOverrides: "Header overrides",
  raw: "Raw",
  referrerPolicy: "Referrer Policy",
  remoteAddress: "Remote Address",
  requestHeaders: "Request Headers",
  requestMethod: "Request Method",
  requestUrl: "Request URL",
  responseHeaders: "Response Headers",
  revealHeaderOverrides: "Reveal header override definitions",
  showMore: "Show more",
  statusCode: "Status Code"
};
const str_ = i18n.i18n.registerUIStrings("panels/network/components/RequestHeadersView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class RequestHeadersView extends UI.Widget.VBox {
  #requestHeadersComponent = new RequestHeadersComponent();
  #request;
  constructor(request) {
    super();
    this.#request = request;
    this.contentElement.appendChild(this.#requestHeadersComponent);
  }
  wasShown() {
    this.#request.addEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.ResponseHeadersChanged, this.#resetAndRefreshHeadersView, this);
    this.#refreshHeadersView();
  }
  willHide() {
    this.#request.removeEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.ResponseHeadersChanged, this.#resetAndRefreshHeadersView, this);
  }
  #resetAndRefreshHeadersView() {
    this.#request.deleteAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY);
    this.#requestHeadersComponent.data = {
      request: this.#request
    };
  }
  #refreshHeadersView() {
    this.#requestHeadersComponent.data = {
      request: this.#request
    };
  }
  revealHeader(section, header) {
    this.#requestHeadersComponent.data = {
      request: this.#request,
      toReveal: { section, header }
    };
  }
}
export class RequestHeadersComponent extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-request-headers`;
  #shadow = this.attachShadow({ mode: "open" });
  #request;
  #showResponseHeadersText = false;
  #showRequestHeadersText = false;
  #showResponseHeadersTextFull = false;
  #showRequestHeadersTextFull = false;
  #toReveal = void 0;
  #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  set data(data) {
    this.#request = data.request;
    this.#toReveal = data.toReveal;
    this.#render();
  }
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles];
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance().moduleSetting("persistenceNetworkOverridesEnabled").addChangeListener(this.#render, this);
  }
  disconnectedCallback() {
    this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance().moduleSetting("persistenceNetworkOverridesEnabled").removeChangeListener(this.#render, this);
  }
  #uiSourceCodeAddedOrRemoved(event) {
    if (this.#getHeaderOverridesFileUrl() === event.data.url()) {
      this.#render();
    }
  }
  #render() {
    if (!this.#request) {
      return;
    }
    render(html`
      ${this.#renderGeneralSection()}
      ${this.#renderResponseHeaders()}
      ${this.#renderRequestHeaders()}
    `, this.#shadow, { host: this });
  }
  #renderResponseHeaders() {
    if (!this.#request) {
      return LitHtml.nothing;
    }
    const toggleShowRaw = () => {
      this.#showResponseHeadersText = !this.#showResponseHeadersText;
      this.#render();
    };
    return html`
      <${Category.litTagName}
        @togglerawevent=${toggleShowRaw}
        .data=${{
      name: "responseHeaders",
      title: i18nString(UIStrings.responseHeaders),
      headerCount: this.#request.sortedResponseHeaders.length,
      checked: this.#request.responseHeadersText ? this.#showResponseHeadersText : void 0,
      additionalContent: this.#renderHeaderOverridesLink(),
      forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Response
    }}
        aria-label=${i18nString(UIStrings.responseHeaders)}
      >
        ${this.#showResponseHeadersText ? this.#renderRawHeaders(this.#request.responseHeadersText, true) : html`
          <${ResponseHeaderSection.litTagName} .data=${{
      request: this.#request,
      toReveal: this.#toReveal
    }}></${ResponseHeaderSection.litTagName}>
        `}
      </${Category.litTagName}>
    `;
  }
  #renderHeaderOverridesLink() {
    const overrideable = Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    if (!overrideable || !this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl())) {
      return LitHtml.nothing;
    }
    const overridesSetting = Common.Settings.Settings.instance().moduleSetting("persistenceNetworkOverridesEnabled");
    const fileIcon = overridesSetting.get() ? html`
      <${IconButton.Icon.Icon.litTagName} class="inline-icon purple-dot" .data=${{
      iconName: "file-sync_icon",
      width: "11px",
      height: "13px"
    }}>
      </${IconButton.Icon.Icon.litTagName}>` : html`
      <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
      iconName: "file_icon",
      color: "var(--color-text-primary)",
      width: "12px",
      height: "12px"
    }}>
      </${IconButton.Icon.Icon.litTagName}>`;
    const revealHeadersFile = (event) => {
      event.preventDefault();
      const uiSourceCode = this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl());
      if (uiSourceCode) {
        Sources.SourcesPanel.SourcesPanel.instance().showUISourceCode(uiSourceCode);
      }
    };
    return html`
      <x-link @click=${revealHeadersFile} class="link devtools-link" title=${UIStrings.revealHeaderOverrides}>
        ${fileIcon}${i18nString(UIStrings.headerOverrides)}
      </x-link>
    `;
  }
  #getHeaderOverridesFileUrl() {
    if (!this.#request) {
      return Platform.DevToolsPath.EmptyUrlString;
    }
    const fileUrl = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().fileUrlFromNetworkUrl(this.#request.url(), true);
    return fileUrl.substring(0, fileUrl.lastIndexOf("/")) + "/" + Persistence.NetworkPersistenceManager.HEADERS_FILENAME;
  }
  #renderRequestHeaders() {
    if (!this.#request) {
      return LitHtml.nothing;
    }
    const requestHeadersText = this.#request.requestHeadersText();
    const toggleShowRaw = () => {
      this.#showRequestHeadersText = !this.#showRequestHeadersText;
      this.#render();
    };
    return html`
      <${Category.litTagName}
        @togglerawevent=${toggleShowRaw}
        .data=${{
      name: "requestHeaders",
      title: i18nString(UIStrings.requestHeaders),
      headerCount: this.#request.requestHeaders().length,
      checked: requestHeadersText ? this.#showRequestHeadersText : void 0,
      forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Request
    }}
        aria-label=${i18nString(UIStrings.requestHeaders)}
      >
        ${this.#showRequestHeadersText && requestHeadersText ? this.#renderRawHeaders(requestHeadersText, false) : html`
          <${RequestHeaderSection.litTagName} .data=${{
      request: this.#request,
      toReveal: this.#toReveal
    }}></${RequestHeaderSection.litTagName}>
        `}
      </${Category.litTagName}>
    `;
  }
  #renderRawHeaders(rawHeadersText, forResponseHeaders) {
    const trimmed = rawHeadersText.trim();
    const showFull = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
    const isShortened = !showFull && trimmed.length > RAW_HEADER_CUTOFF;
    const showMore = () => {
      if (forResponseHeaders) {
        this.#showResponseHeadersTextFull = true;
      } else {
        this.#showRequestHeadersTextFull = true;
      }
      this.#render();
    };
    const onContextMenuOpen = (event) => {
      const showFull2 = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
      if (!showFull2) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const section = contextMenu.newSection();
        section.appendItem(i18nString(UIStrings.showMore), showMore);
        void contextMenu.show();
      }
    };
    const addContextMenuListener = (el) => {
      if (isShortened) {
        el.addEventListener("contextmenu", onContextMenuOpen);
      }
    };
    return html`
      <div class="row raw-headers-row" on-render=${ComponentHelpers.Directives.nodeRenderedCallback(addContextMenuListener)}>
        <div class="raw-headers">${isShortened ? trimmed.substring(0, RAW_HEADER_CUTOFF) : trimmed}</div>
        ${isShortened ? html`
          <${Buttons.Button.Button.litTagName}
            .size=${Buttons.Button.Size.SMALL}
            .variant=${Buttons.Button.Variant.SECONDARY}
            @click=${showMore}
          >${i18nString(UIStrings.showMore)}</${Buttons.Button.Button.litTagName}>
        ` : LitHtml.nothing}
      </div>
    `;
  }
  #renderGeneralSection() {
    if (!this.#request) {
      return LitHtml.nothing;
    }
    const statusClasses = [];
    if (this.#request.statusCode < 300 || this.#request.statusCode === 304) {
      statusClasses.push("green-circle");
    } else if (this.#request.statusCode < 400) {
      statusClasses.push("yellow-circle");
    } else {
      statusClasses.push("red-circle");
    }
    let statusText = this.#request.statusCode + " " + this.#request.statusText;
    if (this.#request.cachedInMemory()) {
      statusText += " " + i18nString(UIStrings.fromMemoryCache);
      statusClasses.push("status-with-comment");
    } else if (this.#request.fetchedViaServiceWorker) {
      statusText += " " + i18nString(UIStrings.fromServiceWorker);
      statusClasses.push("status-with-comment");
    } else if (this.#request.redirectSourceSignedExchangeInfoHasNoErrors()) {
      statusText += " " + i18nString(UIStrings.fromSignedexchange);
      statusClasses.push("status-with-comment");
    } else if (this.#request.webBundleInnerRequestInfo()) {
      statusText += " " + i18nString(UIStrings.fromWebBundle);
      statusClasses.push("status-with-comment");
    } else if (this.#request.fromPrefetchCache()) {
      statusText += " " + i18nString(UIStrings.fromPrefetchCache);
      statusClasses.push("status-with-comment");
    } else if (this.#request.cached()) {
      statusText += " " + i18nString(UIStrings.fromDiskCache);
      statusClasses.push("status-with-comment");
    }
    return html`
      <${Category.litTagName}
        .data=${{
      name: "general",
      title: i18nString(UIStrings.general),
      forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.General
    }}
        aria-label=${i18nString(UIStrings.general)}
      >
        ${this.#renderGeneralRow(i18nString(UIStrings.requestUrl), this.#request.url())}
        ${this.#request.statusCode ? this.#renderGeneralRow(i18nString(UIStrings.requestMethod), this.#request.requestMethod) : LitHtml.nothing}
        ${this.#request.statusCode ? this.#renderGeneralRow(i18nString(UIStrings.statusCode), statusText, statusClasses) : LitHtml.nothing}
        ${this.#request.remoteAddress() ? this.#renderGeneralRow(i18nString(UIStrings.remoteAddress), this.#request.remoteAddress()) : LitHtml.nothing}
        ${this.#request.referrerPolicy() ? this.#renderGeneralRow(i18nString(UIStrings.referrerPolicy), String(this.#request.referrerPolicy())) : LitHtml.nothing}
      </${Category.litTagName}>
    `;
  }
  #renderGeneralRow(name, value, classNames) {
    const isHighlighted = this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.General && name.toLowerCase() === this.#toReveal?.header?.toLowerCase();
    return html`
      <div class="row ${isHighlighted ? "header-highlight" : ""}">
        <div class="header-name">${name}:</div>
        <div
          class="header-value ${classNames?.join(" ")}"
          @copy=${() => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >${value}</div>
      </div>
    `;
  }
}
export class ToggleRawHeadersEvent extends Event {
  static eventName = "togglerawevent";
  constructor() {
    super(ToggleRawHeadersEvent.eventName, {});
  }
}
export class Category extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-request-headers-category`;
  #shadow = this.attachShadow({ mode: "open" });
  #expandedSetting;
  #title = Common.UIString.LocalizedEmptyString;
  #headerCount = void 0;
  #checked = void 0;
  #additionalContent = void 0;
  #forceOpen = void 0;
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles, Input.checkboxStyles];
  }
  set data(data) {
    this.#title = data.title;
    this.#expandedSetting = Common.Settings.Settings.instance().createSetting("request-info-" + data.name + "-category-expanded", true);
    this.#headerCount = data.headerCount;
    this.#checked = data.checked;
    this.#additionalContent = data.additionalContent;
    this.#forceOpen = data.forceOpen;
    this.#render();
  }
  #onCheckboxToggle() {
    this.dispatchEvent(new ToggleRawHeadersEvent());
  }
  #render() {
    const isOpen = (this.#expandedSetting ? this.#expandedSetting.get() : true) || this.#forceOpen;
    render(html`
      <details ?open=${isOpen} @toggle=${this.#onToggle}>
        <summary class="header" @keydown=${this.#onSummaryKeyDown}>
          <div class="header-grid-container">
            <div>
              ${this.#title}${this.#headerCount !== void 0 ? html`<span class="header-count"> (${this.#headerCount})</span>` : LitHtml.nothing}
            </div>
            <div class="hide-when-closed">
              ${this.#checked !== void 0 ? html`
                <label><input type="checkbox" .checked=${this.#checked} @change=${this.#onCheckboxToggle} />${i18nString(UIStrings.raw)}</label>
              ` : LitHtml.nothing}
            </div>
            <div class="hide-when-closed">${this.#additionalContent}</div>
        </summary>
        <slot></slot>
      </details>
    `, this.#shadow, { host: this });
  }
  #onSummaryKeyDown(event) {
    if (!event.target) {
      return;
    }
    const summaryElement = event.target;
    const detailsElement = summaryElement.parentElement;
    if (!detailsElement) {
      throw new Error("<details> element is not found for a <summary> element");
    }
    switch (event.key) {
      case "ArrowLeft":
        detailsElement.open = false;
        break;
      case "ArrowRight":
        detailsElement.open = true;
        break;
    }
  }
  #onToggle(event) {
    this.#expandedSetting?.set(event.target.open);
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-request-headers", RequestHeadersComponent);
ComponentHelpers.CustomElements.defineComponent("devtools-request-headers-category", Category);
//# sourceMappingURL=RequestHeadersView.js.map
