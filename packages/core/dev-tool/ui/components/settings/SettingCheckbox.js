import * as ComponentHelpers from "../helpers/helpers.js";
import * as LitHtml from "../../lit-html/lit-html.js";
import * as Input from "../input/input.js";
import settingCheckboxStyles from "./settingCheckbox.css.js";
import { SettingDeprecationWarning } from "./SettingDeprecationWarning.js";
export class SettingCheckbox extends HTMLElement {
  static litTagName = LitHtml.literal`setting-checkbox`;
  #shadow = this.attachShadow({ mode: "open" });
  #setting;
  #disabled = false;
  #changeListenerDescriptor;
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [
      Input.checkboxStyles,
      settingCheckboxStyles,
    ];
  }
  set data(data) {
    if (this.#changeListenerDescriptor && this.#setting) {
      this.#setting.removeChangeListener(
        this.#changeListenerDescriptor.listener
      );
    }
    this.#setting = data.setting;
    this.#disabled = Boolean(data.disabled);
    this.#changeListenerDescriptor = this.#setting.addChangeListener(() => {
      this.#render();
    });
    this.#render();
  }
  #deprecationIcon() {
    if (!this.#setting?.deprecation) {
      return void 0;
    }
    return LitHtml.html`<${SettingDeprecationWarning.litTagName} .data=${
      this.#setting.deprecation
    }></${SettingDeprecationWarning.litTagName}>`;
  }
  #render() {
    if (!this.#setting) {
      throw new Error('No "Setting" object provided for rendering');
    }
    const icon = this.#deprecationIcon();
    LitHtml.render(
      LitHtml.html`
      <p>
        <label>
          <input type="checkbox" ?checked=${this.#setting.get()} ?disabled=${
        this.#disabled || this.#setting.disabled()
      } @change=${
        this.#checkboxChanged
      } aria-label=${this.#setting.title()} /> ${this.#setting.title()}${icon}
        </label>
      </p>`,
      this.#shadow,
      { host: this }
    );
  }
  #checkboxChanged(e) {
    this.#setting?.set(e.target.checked);
  }
}
ComponentHelpers.CustomElements.defineComponent(
  "setting-checkbox",
  SettingCheckbox
);
//# sourceMappingURL=SettingCheckbox.js.map
