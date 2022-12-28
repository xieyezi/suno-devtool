import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import elementsTreeExpandButtonStyles from "./elementsTreeExpandButton.css.js";
export class ElementsTreeExpandButton extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-elements-tree-expand-button`;
  #shadow = this.attachShadow({ mode: "open" });
  #clickHandler = () => {
  };
  set data(data) {
    this.#clickHandler = data.clickHandler;
    this.#update();
  }
  #update() {
    this.#render();
  }
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [elementsTreeExpandButtonStyles];
  }
  #render() {
    LitHtml.render(LitHtml.html`<span
        class="expand-button"
        @click=${this.#clickHandler}><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`, this.#shadow, { host: this });
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-elements-tree-expand-button", ElementsTreeExpandButton);
//# sourceMappingURL=ElementsTreeExpandButton.js.map
