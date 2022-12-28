import * as i18n from "../../../../core/i18n/i18n.js";
import * as Platform from "../../../../core/platform/platform.js";
import * as ComponentHelpers from "../../../components/helpers/helpers.js";
import * as LitHtml from "../../../lit-html/lit-html.js";
import linkSwatchStyles from "./linkSwatch.css.js";
const UIStrings = {
  sIsNotDefined: "{PH1} is not defined"
};
const str_ = i18n.i18n.registerUIStrings("ui/legacy/components/inline_editor/LinkSwatch.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
const { render, html, Directives } = LitHtml;
class LinkSwatch extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-link-swatch`;
  shadow = this.attachShadow({ mode: "open" });
  onLinkActivate = () => void 0;
  connectedCallback() {
    this.shadow.adoptedStyleSheets = [linkSwatchStyles];
  }
  set data(data) {
    this.onLinkActivate = (linkText, event) => {
      if (event instanceof MouseEvent && event.button !== 0) {
        return;
      }
      if (event instanceof KeyboardEvent && !Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        return;
      }
      data.onLinkActivate(linkText);
      event.consume(true);
    };
    this.render(data);
  }
  render(data) {
    const { isDefined, text, title } = data;
    const classes = Directives.classMap({
      "link-swatch-link": true,
      "undefined": !isDefined
    });
    const onActivate = isDefined ? this.onLinkActivate.bind(this, text.trim()) : null;
    render(html`<span class=${classes} title=${title} @mousedown=${onActivate} @keydown=${onActivate} role="link" tabindex="-1">${text}</span>`, this.shadow, { host: this });
  }
}
const VARIABLE_FUNCTION_REGEX = /(^var\()\s*(--(?:[\s\w\P{ASCII}-]|\\.)+)(,?\s*.*)\s*(\))$/u;
export class CSSVarSwatch extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-css-var-swatch`;
  shadow = this.attachShadow({ mode: "open" });
  constructor() {
    super();
    this.tabIndex = -1;
    this.addEventListener("focus", () => {
      const link = this.shadow.querySelector('[role="link"]');
      if (link) {
        link.focus();
      }
    });
  }
  set data(data) {
    this.render(data);
  }
  parseVariableFunctionParts(text) {
    const result = text.replace(/\s{2,}/g, " ").match(VARIABLE_FUNCTION_REGEX);
    if (!result) {
      return null;
    }
    return {
      pre: result[1],
      variableName: result[2],
      fallbackIncludeComma: result[3],
      post: result[4]
    };
  }
  variableName(text) {
    const match = text.match(VARIABLE_FUNCTION_REGEX);
    if (match) {
      return match[2];
    }
    return "";
  }
  render(data) {
    const { text, fromFallback, computedValue, onLinkActivate } = data;
    const functionParts = this.parseVariableFunctionParts(text);
    if (!functionParts) {
      render("", this.shadow, { host: this });
      return;
    }
    const isDefined = Boolean(computedValue) && !fromFallback;
    const title = isDefined ? computedValue : i18nString(UIStrings.sIsNotDefined, { PH1: this.variableName(text) });
    const fallbackIncludeComma = functionParts.fallbackIncludeComma ? functionParts.fallbackIncludeComma : "";
    render(html`<span title=${data.computedValue || ""}>${functionParts.pre}<${LinkSwatch.litTagName} .data=${{ title, text: functionParts.variableName, isDefined, onLinkActivate }}></${LinkSwatch.litTagName}>${fallbackIncludeComma}${functionParts.post}</span>`, this.shadow, { host: this });
  }
}
export class AnimationNameSwatch extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-animation-name-swatch`;
  shadow = this.attachShadow({ mode: "open" });
  set data(data) {
    this.render(data);
  }
  render(data) {
    const { text, isDefined, onLinkActivate } = data;
    const title = isDefined ? text : i18nString(UIStrings.sIsNotDefined, { PH1: text });
    render(html`<span title=${data.text}><${LinkSwatch.litTagName} .data=${{
      text,
      isDefined,
      title,
      onLinkActivate
    }}></${LinkSwatch.litTagName}></span>`, this.shadow, { host: this });
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-animation-name-swatch", AnimationNameSwatch);
ComponentHelpers.CustomElements.defineComponent("devtools-css-var-swatch", CSSVarSwatch);
ComponentHelpers.CustomElements.defineComponent("devtools-link-swatch", LinkSwatch);
//# sourceMappingURL=LinkSwatch.js.map
