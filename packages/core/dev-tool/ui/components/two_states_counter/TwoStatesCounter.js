import * as LitHtml from "../../lit-html/lit-html.js";
import * as ComponentHelpers from "../helpers/helpers.js";
import twoStatesCounterStyles from "./twoStatesCounter.css.js";
const isString = (value) => value !== void 0;
export class TwoStatesCounter extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-two-states-counter`;
  #boundRender = this.#render.bind(this);
  #shadow = this.attachShadow({ mode: "open" });
  #numActive = 0;
  #numInactive = 0;
  #width = "14px";
  #height = "14px";
  #activeTitle;
  #inactiveTitle;
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [twoStatesCounterStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }
  set data(data) {
    if (data.active < 0 || data.inactive < 0) {
      throw new Error("Values need to be greater or equal to zero.");
    }
    this.#numActive = data.active;
    this.#numInactive = data.inactive;
    this.#width = isString(data.width) ? data.width : this.#width;
    this.#height = isString(data.height) ? data.height : this.#height;
    this.#activeTitle = data.activeTitle;
    this.#inactiveTitle = data.inactiveTitle;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }
  #render() {
    if (this.#numActive === 0 && this.#numInactive === 0) {
      return;
    }
    const showBothNumbers = this.#numActive > 0 && this.#numInactive > 0;
    const commonClasses = {
      part: true,
      split: showBothNumbers
    };
    const activeClassMap = {
      ...commonClasses,
      active: true
    };
    const inactiveClassMap = {
      ...commonClasses,
      inactive: true
    };
    LitHtml.render(LitHtml.html`
    <div class='counter'>
      ${this.#renderPart(this.#numActive, activeClassMap, this.#activeTitle)}
      ${this.#renderPart(this.#numInactive, inactiveClassMap, this.#inactiveTitle)}
    </div>
    `, this.#shadow, { host: this });
  }
  #renderPart(count, classInfo, title) {
    const styles = {
      width: this.#width,
      height: this.#height
    };
    return count > 0 ? LitHtml.html`
       <span class=${LitHtml.Directives.classMap(classInfo)} style=${LitHtml.Directives.styleMap(styles)} title=${title}>
          ${count}
       </span>
      ` : LitHtml.nothing;
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-two-states-counter", TwoStatesCounter);
//# sourceMappingURL=TwoStatesCounter.js.map
