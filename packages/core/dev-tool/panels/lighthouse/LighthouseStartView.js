import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
import { Events, Presets, RuntimeSettings } from "./LighthouseController.js";
import { RadioSetting } from "./RadioSetting.js";
import lighthouseStartViewStyles from "./lighthouseStartView.css.js";
const UIStrings = {
  generateLighthouseReport: "Generate a Lighthouse report",
  mode: "Mode",
  categories: "Categories",
  plugins: "Plugins",
  analyzeNavigation: "Analyze page load",
  analyzeSnapshot: "Analyze page state",
  startTimespan: "Start timespan",
  learnMore: "Learn more",
  device: "Device"
};
const str_ = i18n.i18n.registerUIStrings("panels/lighthouse/LighthouseStartView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class StartView extends UI.Widget.Widget {
  controller;
  settingsToolbarInternal;
  startButton;
  helpText;
  warningText;
  checkboxes = [];
  changeFormMode;
  constructor(controller) {
    super();
    this.controller = controller;
    this.settingsToolbarInternal = new UI.Toolbar.Toolbar("");
    this.render();
  }
  populateRuntimeSettingAsRadio(settingName, label, parentElement) {
    const runtimeSetting = RuntimeSettings.find((item) => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.options) {
      throw new Error(`${settingName} is not a setting with options`);
    }
    const labelEl = document.createElement("div");
    labelEl.classList.add("lighthouse-form-section-label");
    labelEl.textContent = label;
    if (runtimeSetting.learnMore) {
      const link = UI.XLink.XLink.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), "lighthouse-learn-more");
      labelEl.append(link);
    }
    parentElement.appendChild(labelEl);
    const control = new RadioSetting(runtimeSetting.options, runtimeSetting.setting, runtimeSetting.description());
    parentElement.appendChild(control.element);
    UI.ARIAUtils.setAccessibleName(control.element, label);
  }
  populateRuntimeSettingAsToolbarCheckbox(settingName, toolbar) {
    const runtimeSetting = RuntimeSettings.find((item) => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.title) {
      throw new Error(`${settingName} is not a setting with a title`);
    }
    runtimeSetting.setting.setTitle(runtimeSetting.title());
    const control = new UI.Toolbar.ToolbarSettingCheckbox(runtimeSetting.setting, runtimeSetting.description());
    toolbar.appendToolbarItem(control);
    if (runtimeSetting.learnMore) {
      const link = UI.XLink.XLink.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), "lighthouse-learn-more");
      link.style.margin = "5px";
      control.element.appendChild(link);
    }
  }
  populateRuntimeSettingAsToolbarDropdown(settingName, toolbar) {
    const runtimeSetting = RuntimeSettings.find((item) => item.setting.name === settingName);
    if (!runtimeSetting || !runtimeSetting.title) {
      throw new Error(`${settingName} is not a setting with a title`);
    }
    const options = runtimeSetting.options?.map((option) => ({ label: option.label(), value: option.value })) || [];
    runtimeSetting.setting.setTitle(runtimeSetting.title());
    const control = new UI.Toolbar.ToolbarSettingComboBox(options, runtimeSetting.setting, runtimeSetting.title());
    control.setTitle(runtimeSetting.description());
    toolbar.appendToolbarItem(control);
    if (runtimeSetting.learnMore) {
      const link = UI.XLink.XLink.create(runtimeSetting.learnMore, i18nString(UIStrings.learnMore), "lighthouse-learn-more");
      link.style.margin = "5px";
      control.element.appendChild(link);
    }
  }
  populateFormControls(fragment, mode) {
    const deviceTypeFormElements = fragment.$("device-type-form-elements");
    this.populateRuntimeSettingAsRadio("lighthouse.device_type", i18nString(UIStrings.device), deviceTypeFormElements);
    const categoryFormElements = fragment.$("categories-form-elements");
    const pluginFormElements = fragment.$("plugins-form-elements");
    this.checkboxes = [];
    for (const preset of Presets) {
      const formElements = preset.plugin ? pluginFormElements : categoryFormElements;
      preset.setting.setTitle(preset.title());
      const checkbox = new UI.Toolbar.ToolbarSettingCheckbox(preset.setting, preset.description());
      const row = formElements.createChild("div", "vbox lighthouse-launcher-row");
      row.appendChild(checkbox.element);
      checkbox.element.setAttribute("data-lh-category", preset.configID);
      this.checkboxes.push({ preset, checkbox });
      if (mode && !preset.supportedModes.includes(mode)) {
        checkbox.setEnabled(false);
        checkbox.setIndeterminate(true);
      }
    }
    UI.ARIAUtils.markAsGroup(categoryFormElements);
    UI.ARIAUtils.setAccessibleName(categoryFormElements, i18nString(UIStrings.categories));
    UI.ARIAUtils.markAsGroup(pluginFormElements);
    UI.ARIAUtils.setAccessibleName(pluginFormElements, i18nString(UIStrings.plugins));
  }
  render() {
    this.populateRuntimeSettingAsToolbarCheckbox("lighthouse.legacy_navigation", this.settingsToolbarInternal);
    this.populateRuntimeSettingAsToolbarCheckbox("lighthouse.clear_storage", this.settingsToolbarInternal);
    this.populateRuntimeSettingAsToolbarDropdown("lighthouse.throttling", this.settingsToolbarInternal);
    const { mode } = this.controller.getFlags();
    this.populateStartButton(mode);
    const fragment = UI.Fragment.Fragment.build`
<form class="lighthouse-start-view">
  <header class="hbox">
    <div class="lighthouse-logo"></div>
    <div class="lighthouse-title">${i18nString(UIStrings.generateLighthouseReport)}</div>
    <div class="lighthouse-start-button-container" $="start-button-container">${this.startButton}</div>
  </header>
  <div $="help-text" class="lighthouse-help-text hidden"></div>
  <div class="lighthouse-options hbox">
    <div class="lighthouse-form-section">
      <div class="lighthouse-form-elements" $="mode-form-elements"></div>
    </div>
    <div class="lighthouse-form-section">
      <div class="lighthouse-form-elements" $="device-type-form-elements"></div>
    </div>
    <div class="lighthouse-form-categories">
      <div class="lighthouse-form-section">
        <div class="lighthouse-form-section-label">${i18nString(UIStrings.categories)}</div>
        <div class="lighthouse-form-elements" $="categories-form-elements"></div>
      </div>
      <div class="lighthouse-form-section">
        <div class="lighthouse-form-section-label">
          <div class="lighthouse-icon-label">${i18nString(UIStrings.plugins)}</div>
        </div>
        <div class="lighthouse-form-elements" $="plugins-form-elements"></div>
      </div>
    </div>
  </div>
  <div $="warning-text" class="lighthouse-warning-text hidden"></div>
</form>
    `;
    this.helpText = fragment.$("help-text");
    this.warningText = fragment.$("warning-text");
    const modeFormElements = fragment.$("mode-form-elements");
    this.populateRuntimeSettingAsRadio("lighthouse.mode", i18nString(UIStrings.mode), modeFormElements);
    this.populateFormControls(fragment, mode);
    this.contentElement.textContent = "";
    this.contentElement.append(fragment.element());
    this.refresh();
  }
  populateStartButton(mode) {
    let buttonLabel;
    let callback;
    if (mode === "timespan") {
      buttonLabel = i18nString(UIStrings.startTimespan);
      callback = () => {
        this.controller.dispatchEventToListeners(Events.RequestLighthouseTimespanStart, this.startButton.matches(":focus-visible"));
      };
    } else if (mode === "snapshot") {
      buttonLabel = i18nString(UIStrings.analyzeSnapshot);
      callback = () => {
        this.controller.dispatchEventToListeners(Events.RequestLighthouseStart, this.startButton.matches(":focus-visible"));
      };
    } else {
      buttonLabel = i18nString(UIStrings.analyzeNavigation);
      callback = () => {
        this.controller.dispatchEventToListeners(Events.RequestLighthouseStart, this.startButton.matches(":focus-visible"));
      };
    }
    const startButtonContainer = this.contentElement.querySelector(".lighthouse-start-button-container");
    if (startButtonContainer) {
      startButtonContainer.textContent = "";
      this.startButton = UI.UIUtils.createTextButton(buttonLabel, callback, "", true);
      startButtonContainer.append(this.startButton);
    }
  }
  refresh() {
    const { mode } = this.controller.getFlags();
    this.populateStartButton(mode);
    for (const { checkbox, preset } of this.checkboxes) {
      if (preset.supportedModes.includes(mode)) {
        checkbox.setEnabled(true);
        checkbox.setIndeterminate(false);
      } else {
        checkbox.setEnabled(false);
        checkbox.setIndeterminate(true);
      }
    }
    this.onResize();
  }
  onResize() {
    const useNarrowLayout = this.contentElement.offsetWidth < 500;
    const useWideLayout = this.contentElement.offsetWidth > 800;
    const headerEl = this.contentElement.querySelector(".lighthouse-start-view header");
    const optionsEl = this.contentElement.querySelector(".lighthouse-options");
    if (headerEl) {
      headerEl.classList.toggle("hbox", !useNarrowLayout);
      headerEl.classList.toggle("vbox", useNarrowLayout);
    }
    if (optionsEl) {
      optionsEl.classList.toggle("wide", useWideLayout);
      optionsEl.classList.toggle("narrow", useNarrowLayout);
    }
  }
  focusStartButton() {
    this.startButton.focus();
  }
  setStartButtonEnabled(isEnabled) {
    if (this.helpText) {
      this.helpText.classList.toggle("hidden", isEnabled);
    }
    if (this.startButton) {
      this.startButton.disabled = !isEnabled;
    }
  }
  setUnauditableExplanation(text) {
    if (this.helpText) {
      this.helpText.textContent = text;
    }
  }
  setWarningText(text) {
    if (this.warningText) {
      this.warningText.textContent = text;
      this.warningText.classList.toggle("hidden", !text);
    }
  }
  wasShown() {
    super.wasShown();
    this.controller.recomputePageAuditability();
    this.registerCSSFiles([lighthouseStartViewStyles]);
  }
  settingsToolbar() {
    return this.settingsToolbarInternal;
  }
}
//# sourceMappingURL=LighthouseStartView.js.map
