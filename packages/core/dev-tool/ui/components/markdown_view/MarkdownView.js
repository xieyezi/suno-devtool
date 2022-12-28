import * as LitHtml from "../../lit-html/lit-html.js";
import * as ComponentHelpers from "../../components/helpers/helpers.js";
import markdownViewStyles from "./markdownView.css.js";
import { MarkdownLink } from "./MarkdownLink.js";
import { MarkdownImage } from "./MarkdownImage.js";
const html = LitHtml.html;
const render = LitHtml.render;
export class MarkdownView extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-markdown-view`;
  #shadow = this.attachShadow({ mode: "open" });
  #tokenData = [];
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [markdownViewStyles];
  }
  set data(data) {
    this.#tokenData = data.tokens;
    this.#update();
  }
  #update() {
    this.#render();
  }
  #render() {
    render(html`
      <div class='message'>
        ${this.#tokenData.map(renderToken)}
      </div>
    `, this.#shadow, { host: this });
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-markdown-view", MarkdownView);
const renderChildTokens = (token) => {
  if ("tokens" in token && token.tokens) {
    return token.tokens.map(renderToken);
  }
  throw new Error("Tokens not found");
};
const unescape = (text) => {
  const escapeReplacements = /* @__PURE__ */ new Map([
    ["&amp;", "&"],
    ["&lt;", "<"],
    ["&gt;", ">"],
    ["&quot;", '"'],
    ["&#39;", "'"]
  ]);
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (matchedString) => {
    const replacement = escapeReplacements.get(matchedString);
    return replacement ? replacement : matchedString;
  });
};
const renderText = (token) => {
  if ("tokens" in token && token.tokens) {
    return html`${renderChildTokens(token)}`;
  }
  return html`${unescape("text" in token ? token.text : "")}`;
};
function templateForToken(token) {
  switch (token.type) {
    case "paragraph":
      return html`<p>${renderChildTokens(token)}`;
    case "list":
      return html`<ul>${token.items.map(renderToken)}</ul>`;
    case "list_item":
      return html`<li>${renderChildTokens(token)}`;
    case "text":
      return renderText(token);
    case "codespan":
      return html`<code>${unescape(token.text)}</code>`;
    case "space":
      return html``;
    case "link":
      return html`<${MarkdownLink.litTagName} .data=${{ key: token.href, title: token.text }}></${MarkdownLink.litTagName}>`;
    case "image":
      return html`<${MarkdownImage.litTagName} .data=${{ key: token.href, title: token.text }}></${MarkdownImage.litTagName}>`;
    default:
      return null;
  }
}
export const renderToken = (token) => {
  const template = templateForToken(token);
  if (template === null) {
    throw new Error(`Markdown token type '${token.type}' not supported.`);
  }
  return template;
};
//# sourceMappingURL=MarkdownView.js.map
