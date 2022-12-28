import * as Common from "../../../../core/common/common.js";
import * as i18n from "../../../../core/i18n/i18n.js";
import * as ComponentHelpers from "../../../components/helpers/helpers.js";
import * as LitHtml from "../../../lit-html/lit-html.js";
import colorSwatchStyles from "./colorSwatch.css.js";
const UIStrings = {
  shiftclickToChangeColorFormat: "Shift-click to change color format"
};
const str_ = i18n.i18n.registerUIStrings("ui/legacy/components/inline_editor/ColorSwatch.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class FormatChangedEvent extends Event {
  static eventName = "formatchanged";
  data;
  constructor(format, text) {
    super(FormatChangedEvent.eventName, {});
    this.data = { format, text };
  }
}
export class ClickEvent extends Event {
  static eventName = "swatchclick";
  constructor() {
    super(ClickEvent.eventName, {});
  }
}
export class ColorSwatch extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-color-swatch`;
  shadow = this.attachShadow({ mode: "open" });
  tooltip = i18nString(UIStrings.shiftclickToChangeColorFormat);
  text = null;
  color = null;
  format = null;
  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      colorSwatchStyles
    ];
  }
  static isColorSwatch(element) {
    return element.localName === "devtools-color-swatch";
  }
  getColor() {
    return this.color;
  }
  getFormat() {
    return this.format;
  }
  getText() {
    return this.text;
  }
  get anchorBox() {
    const swatch = this.shadow.querySelector(".color-swatch");
    return swatch ? swatch.boxInWindow() : null;
  }
  renderColor(color, formatOrUseUserSetting, tooltip) {
    if (typeof color === "string") {
      this.color = Common.Color.parse(color);
      this.text = color;
      if (!this.color) {
        this.renderTextOnly();
        return;
      }
    } else {
      this.color = color;
    }
    if (typeof formatOrUseUserSetting === "boolean" && formatOrUseUserSetting) {
      this.format = Common.Settings.detectColorFormat(this.color);
    } else if (typeof formatOrUseUserSetting === "string") {
      this.format = Common.Color.getFormat(formatOrUseUserSetting);
    } else {
      this.format = this.color.format();
    }
    this.text = this.color.asString(this.format ?? void 0);
    if (tooltip) {
      this.tooltip = tooltip;
    }
    if (!(this.color instanceof Common.Color.Legacy)) {
      this.renderCircularColorSwatch();
    } else {
      this.render();
    }
  }
  renderTextOnly() {
    LitHtml.render(this.text, this.shadow, { host: this });
  }
  renderCircularColorSwatch() {
    LitHtml.render(LitHtml.html`<span class="color-swatch circular read-only">
          <span class="color-swatch-inner circular"
          style="background-color: ${this.text};"
          @click=${this.consume}
          @mousedown=${this.consume}
          @dblclick=${this.consume}></span>
        </span><slot><span>${this.text}</span></slot>`, this.shadow, { host: this });
  }
  render() {
    LitHtml.render(LitHtml.html`<span class="color-swatch" title=${this.tooltip}><span class="color-swatch-inner"
        style="background-color: ${this.text};"
        @click=${this.onClick}
        @mousedown=${this.consume}
        @dblclick=${this.consume}></span></span><slot><span>${this.text}</span></slot>`, this.shadow, { host: this });
  }
  onClick(e) {
    e.stopPropagation();
    if (e.shiftKey) {
      this.toggleNextFormat();
      return;
    }
    this.dispatchEvent(new ClickEvent());
  }
  consume(e) {
    e.stopPropagation();
  }
  toggleNextFormat() {
    if (!this.color || !this.format) {
      return;
    }
    let currentValue;
    do {
      this.format = nextColorFormat(this.color.asLegacyColor(), this.format);
      currentValue = this.color.asString(this.format);
    } while (currentValue === this.text);
    if (currentValue) {
      this.text = currentValue;
      this.render();
      this.dispatchEvent(new FormatChangedEvent(this.format, this.text));
    }
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-color-swatch", ColorSwatch);
function nextColorFormat(color, curFormat) {
  switch (curFormat) {
    case Common.Color.Format.RGB:
    case Common.Color.Format.RGBA:
      return !color.hasAlpha() ? Common.Color.Format.HSL : Common.Color.Format.HSLA;
    case Common.Color.Format.HSL:
    case Common.Color.Format.HSLA:
      return !color.hasAlpha() ? Common.Color.Format.HWB : Common.Color.Format.HWBA;
    case Common.Color.Format.HWB:
    case Common.Color.Format.HWBA:
      if (color.nickname()) {
        return Common.Color.Format.Nickname;
      }
      return color.detectHEXFormat();
    case Common.Color.Format.ShortHEX:
      return Common.Color.Format.HEX;
    case Common.Color.Format.ShortHEXA:
      return Common.Color.Format.HEXA;
    case Common.Color.Format.Nickname:
      return color.detectHEXFormat();
    default:
      return Common.Color.Format.RGBA;
  }
}
//# sourceMappingURL=ColorSwatch.js.map
