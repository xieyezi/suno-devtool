import * as Common from "../../../core/common/common.js";
import * as ComponentHelpers from "../helpers/helpers.js";
import * as LitHtml from "../../lit-html/lit-html.js";
import * as IconButton from "../icon_button/icon_button.js";
import settingDeprecationWarning from "./settingDeprecationWarning.css.js";
export class SettingDeprecationWarning extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-setting-deprecation-warning`;
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [settingDeprecationWarning];
  }
  set data(data) {
    this.#render(data);
  }
  #render({ disabled, warning, experiment }) {
    const iconData = {
      iconName: "ic_info_black_18dp",
      color: "var(--color-link)",
      width: "14px",
    };
    const classes = { clickable: false };
    let onclick;
    if (disabled && experiment) {
      classes.clickable = true;
      onclick = () => {
        void Common.Revealer.reveal(experiment);
      };
    }
    LitHtml.render(
      LitHtml.html`<${
        IconButton.Icon.Icon.litTagName
      } class=${LitHtml.Directives.classMap(
        classes
      )} .data=${iconData} title=${warning} @click=${onclick}></${
        IconButton.Icon.Icon.litTagName
      }>`,
      this.#shadow,
      { host: this }
    );
  }
}
ComponentHelpers.CustomElements.defineComponent(
  "devtools-setting-deprecation-warning",
  SettingDeprecationWarning
);
//# sourceMappingURL=SettingDeprecationWarning.js.map
