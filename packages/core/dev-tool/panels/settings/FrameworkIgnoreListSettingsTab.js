import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
import frameworkIgnoreListSettingsTabStyles from "./frameworkIgnoreListSettingsTab.css.js";
const UIStrings = {
  frameworkIgnoreList: "Framework Ignore List",
  debuggerWillSkipThroughThe: "Debugger will skip through the scripts and will not stop on exceptions thrown by them.",
  ignoreListContentScripts: "Add content scripts to ignore list",
  ignoreListContentScriptsExtension: "Add content scripts to ignore list (extension scripts in the page)",
  automaticallyIgnoreListKnownThirdPartyScripts: "Automatically add known third-party scripts to ignore list",
  automaticallyIgnoreListKnownThirdPartyScriptsTooltip: "Add sources from the `x_google_ignoreList` field from source maps to the ignore list",
  enableIgnoreListing: "Enable Ignore Listing",
  enableIgnoreListingTooltip: "Uncheck to disable all ignore listing",
  generalExclusionRules: "General exclusion rules:",
  customExclusionRules: "Custom exclusion rules:",
  addPattern: "Add pattern...",
  addFilenamePattern: "Add filename pattern",
  ignoreScriptsWhoseNamesMatchS: "Ignore scripts whose names match ''{PH1}''",
  pattern: "Add Pattern",
  patternCannotBeEmpty: "Pattern cannot be empty",
  patternAlreadyExists: "Pattern already exists",
  patternMustBeAValidRegular: "Pattern must be a valid regular expression"
};
const str_ = i18n.i18n.registerUIStrings("panels/settings/FrameworkIgnoreListSettingsTab.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
let frameworkIgnoreListSettingsTabInstance;
export class FrameworkIgnoreListSettingsTab extends UI.Widget.VBox {
  list;
  setting;
  editor;
  constructor() {
    super(true);
    const header = this.contentElement.createChild("div", "header");
    header.textContent = i18nString(UIStrings.frameworkIgnoreList);
    UI.ARIAUtils.markAsHeading(header, 1);
    this.contentElement.createChild("div", "intro").textContent = i18nString(UIStrings.debuggerWillSkipThroughThe);
    const enabledSetting = Common.Settings.Settings.instance().moduleSetting("enableIgnoreListing");
    const enableIgnoreListing = this.contentElement.createChild("div", "ignore-list-global-enable");
    enableIgnoreListing.appendChild(UI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.enableIgnoreListing), enabledSetting, true));
    UI.Tooltip.Tooltip.install(enableIgnoreListing, i18nString(UIStrings.enableIgnoreListingTooltip));
    const ignoreListOptions = this.contentElement.createChild("div", "ignore-list-options");
    ignoreListOptions.createChild("div", "ignore-list-option-group").textContent = i18nString(UIStrings.generalExclusionRules);
    const ignoreListContentScripts = ignoreListOptions.createChild("div", "ignore-list-option");
    ignoreListContentScripts.appendChild(UI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.ignoreListContentScripts), Common.Settings.Settings.instance().moduleSetting("skipContentScripts"), true));
    UI.Tooltip.Tooltip.install(ignoreListContentScripts, i18nString(UIStrings.ignoreListContentScriptsExtension));
    const automaticallyIgnoreList = ignoreListOptions.createChild("div", "ignore-list-option");
    automaticallyIgnoreList.appendChild(UI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScripts), Common.Settings.Settings.instance().moduleSetting("automaticallyIgnoreListKnownThirdPartyScripts"), true));
    UI.Tooltip.Tooltip.install(automaticallyIgnoreList, i18nString(UIStrings.automaticallyIgnoreListKnownThirdPartyScriptsTooltip));
    ignoreListOptions.createChild("div", "ignore-list-option-group").textContent = i18nString(UIStrings.customExclusionRules);
    this.list = new UI.ListWidget.ListWidget(this);
    this.list.element.classList.add("ignore-list");
    const placeholder = document.createElement("div");
    placeholder.classList.add("ignore-list-empty");
    this.list.setEmptyPlaceholder(placeholder);
    this.list.show(ignoreListOptions);
    const addPatternButton = UI.UIUtils.createTextButton(i18nString(UIStrings.addPattern), this.addButtonClicked.bind(this), "add-button");
    UI.ARIAUtils.setAccessibleName(addPatternButton, i18nString(UIStrings.addFilenamePattern));
    ignoreListOptions.appendChild(addPatternButton);
    this.setting = Common.Settings.Settings.instance().moduleSetting("skipStackFramesPattern");
    this.setting.addChangeListener(this.settingUpdated, this);
    this.setDefaultFocusedElement(addPatternButton);
    enabledSetting.addChangeListener(enabledChanged);
    enabledChanged();
    function enabledChanged() {
      const enabled = enabledSetting.get();
      if (enabled) {
        ignoreListOptions.classList.remove("ignore-listing-disabled");
      } else {
        ignoreListOptions.classList.add("ignore-listing-disabled");
      }
    }
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!frameworkIgnoreListSettingsTabInstance || forceNew) {
      frameworkIgnoreListSettingsTabInstance = new FrameworkIgnoreListSettingsTab();
    }
    return frameworkIgnoreListSettingsTabInstance;
  }
  wasShown() {
    super.wasShown();
    this.list.registerCSSFiles([frameworkIgnoreListSettingsTabStyles]);
    this.registerCSSFiles([frameworkIgnoreListSettingsTabStyles]);
    this.settingUpdated();
  }
  settingUpdated() {
    this.list.clear();
    const patterns = this.setting.getAsArray();
    for (let i = 0; i < patterns.length; ++i) {
      this.list.appendItem(patterns[i], true);
    }
  }
  addButtonClicked() {
    this.list.addNewItem(this.setting.getAsArray().length, { pattern: "", disabled: false });
  }
  renderItem(item, _editable) {
    const element = document.createElement("div");
    const listSetting = this.setting;
    const checkbox = UI.UIUtils.CheckboxLabel.create(item.pattern, !item.disabled);
    const helpText = i18nString(UIStrings.ignoreScriptsWhoseNamesMatchS, { PH1: item.pattern });
    UI.Tooltip.Tooltip.install(checkbox, helpText);
    checkbox.checkboxElement.ariaLabel = helpText;
    checkbox.checkboxElement.addEventListener("change", inputChanged, false);
    element.appendChild(checkbox);
    element.classList.add("ignore-list-item");
    return element;
    function inputChanged() {
      const disabled = !checkbox.checkboxElement.checked;
      if (item.disabled !== disabled) {
        item.disabled = disabled;
        listSetting.setAsArray(listSetting.getAsArray());
      }
    }
  }
  removeItemRequested(item, index) {
    const patterns = this.setting.getAsArray();
    patterns.splice(index, 1);
    this.setting.setAsArray(patterns);
  }
  commitEdit(item, editor, isNew) {
    item.pattern = editor.control("pattern").value.trim();
    const list = this.setting.getAsArray();
    if (isNew) {
      list.push(item);
    }
    this.setting.setAsArray(list);
  }
  beginEdit(item) {
    const editor = this.createEditor();
    editor.control("pattern").value = item.pattern;
    return editor;
  }
  createEditor() {
    if (this.editor) {
      return this.editor;
    }
    const editor = new UI.ListWidget.Editor();
    this.editor = editor;
    const content = editor.contentElement();
    const titles = content.createChild("div", "ignore-list-edit-row");
    titles.createChild("div", "ignore-list-pattern").textContent = i18nString(UIStrings.pattern);
    const fields = content.createChild("div", "ignore-list-edit-row");
    const pattern = editor.createInput("pattern", "text", "/framework\\.js$", patternValidator.bind(this));
    UI.ARIAUtils.setAccessibleName(pattern, i18nString(UIStrings.pattern));
    fields.createChild("div", "ignore-list-pattern").appendChild(pattern);
    return editor;
    function patternValidator(item, index, input) {
      const pattern2 = input.value.trim();
      const patterns = this.setting.getAsArray();
      if (!pattern2.length) {
        return { valid: false, errorMessage: i18nString(UIStrings.patternCannotBeEmpty) };
      }
      for (let i = 0; i < patterns.length; ++i) {
        if (i !== index && patterns[i].pattern === pattern2) {
          return { valid: false, errorMessage: i18nString(UIStrings.patternAlreadyExists) };
        }
      }
      let regex;
      try {
        regex = new RegExp(pattern2);
      } catch (e) {
      }
      if (!regex) {
        return { valid: false, errorMessage: i18nString(UIStrings.patternMustBeAValidRegular) };
      }
      return { valid: true, errorMessage: void 0 };
    }
  }
}
//# sourceMappingURL=FrameworkIgnoreListSettingsTab.js.map
