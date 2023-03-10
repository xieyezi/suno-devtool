import * as i18n from "../../../../core/i18n/i18n.js";
import * as Platform from "../../../../core/platform/platform.js";
import * as SDK from "../../../../core/sdk/sdk.js";
import * as UI from "../../legacy.js";
import * as ObjectUI from "../object_ui/object_ui.js";
import jsonViewStyles from "./jsonView.css.legacy.js";
const UIStrings = {
  find: "Find"
};
const str_ = i18n.i18n.registerUIStrings("ui/legacy/components/source_frame/JSONView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class JSONView extends UI.Widget.VBox {
  initialized;
  parsedJSON;
  startCollapsed;
  searchableView;
  treeOutline;
  currentSearchFocusIndex;
  currentSearchTreeElements;
  searchRegex;
  constructor(parsedJSON, startCollapsed) {
    super();
    this.initialized = false;
    this.registerRequiredCSS(jsonViewStyles);
    this.parsedJSON = parsedJSON;
    this.startCollapsed = Boolean(startCollapsed);
    this.element.classList.add("json-view");
    this.currentSearchFocusIndex = 0;
    this.currentSearchTreeElements = [];
    this.searchRegex = null;
  }
  static async createView(content) {
    const parsedJSON = await JSONView.parseJSON(content);
    if (!parsedJSON || typeof parsedJSON.data !== "object") {
      return null;
    }
    const jsonView = new JSONView(parsedJSON);
    const searchableView = new UI.SearchableView.SearchableView(jsonView, null);
    searchableView.setPlaceholder(i18nString(UIStrings.find));
    jsonView.searchableView = searchableView;
    jsonView.show(searchableView.element);
    return searchableView;
  }
  static createViewSync(obj) {
    const jsonView = new JSONView(new ParsedJSON(obj, "", ""));
    const searchableView = new UI.SearchableView.SearchableView(jsonView, null);
    searchableView.setPlaceholder(i18nString(UIStrings.find));
    jsonView.searchableView = searchableView;
    jsonView.show(searchableView.element);
    jsonView.element.tabIndex = 0;
    return searchableView;
  }
  static parseJSON(text) {
    let returnObj = null;
    if (text) {
      returnObj = JSONView.extractJSON(text);
    }
    if (!returnObj) {
      return Promise.resolve(null);
    }
    try {
      const json = JSON.parse(returnObj.data);
      if (!json) {
        return Promise.resolve(null);
      }
      returnObj.data = json;
    } catch (e) {
      returnObj = null;
    }
    return Promise.resolve(returnObj);
  }
  static extractJSON(text) {
    if (text.startsWith("<")) {
      return null;
    }
    let inner = JSONView.findBrackets(text, "{", "}");
    const inner2 = JSONView.findBrackets(text, "[", "]");
    inner = inner2.length > inner.length ? inner2 : inner;
    if (inner.length === -1 || text.length - inner.length > 80) {
      return null;
    }
    const prefix = text.substring(0, inner.start);
    const suffix = text.substring(inner.end + 1);
    text = text.substring(inner.start, inner.end + 1);
    if (suffix.trim().length && !(suffix.trim().startsWith(")") && prefix.trim().endsWith("("))) {
      return null;
    }
    return new ParsedJSON(text, prefix, suffix);
  }
  static findBrackets(text, open, close) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    let length = end - start - 1;
    if (start === -1 || end === -1 || end < start) {
      length = -1;
    }
    return { start, end, length };
  }
  wasShown() {
    this.initialize();
  }
  initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const obj = SDK.RemoteObject.RemoteObject.fromLocalObject(this.parsedJSON.data);
    const title = this.parsedJSON.prefix + obj.description + this.parsedJSON.suffix;
    this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(obj, title, void 0, true);
    this.treeOutline.enableContextMenu();
    this.treeOutline.setEditable(false);
    if (!this.startCollapsed) {
      this.treeOutline.expand();
    }
    this.element.appendChild(this.treeOutline.element);
    const firstChild = this.treeOutline.firstChild();
    if (firstChild) {
      firstChild.select(true, false);
    }
  }
  jumpToMatch(index) {
    if (!this.searchRegex) {
      return;
    }
    const previousFocusElement = this.currentSearchTreeElements[this.currentSearchFocusIndex];
    if (previousFocusElement) {
      previousFocusElement.setSearchRegex(this.searchRegex);
    }
    const newFocusElement = this.currentSearchTreeElements[index];
    if (newFocusElement) {
      this.updateSearchIndex(index);
      newFocusElement.setSearchRegex(this.searchRegex, UI.UIUtils.highlightedCurrentSearchResultClassName);
      newFocusElement.reveal();
    } else {
      this.updateSearchIndex(0);
    }
  }
  updateSearchCount(count) {
    if (!this.searchableView) {
      return;
    }
    this.searchableView.updateSearchMatchesCount(count);
  }
  updateSearchIndex(index) {
    this.currentSearchFocusIndex = index;
    if (!this.searchableView) {
      return;
    }
    this.searchableView.updateCurrentMatchIndex(index);
  }
  searchCanceled() {
    this.searchRegex = null;
    this.currentSearchTreeElements = [];
    let element;
    for (element = this.treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
      if (!(element instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement)) {
        continue;
      }
      element.revertHighlightChanges();
    }
    this.updateSearchCount(0);
    this.updateSearchIndex(0);
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    let newIndex = this.currentSearchFocusIndex;
    const previousSearchFocusElement = this.currentSearchTreeElements[newIndex];
    this.searchCanceled();
    this.searchRegex = searchConfig.toSearchRegex(true).regex;
    let element;
    for (element = this.treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
      if (!(element instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement)) {
        continue;
      }
      const hasMatch = element.setSearchRegex(this.searchRegex);
      if (hasMatch) {
        this.currentSearchTreeElements.push(element);
      }
      if (previousSearchFocusElement === element) {
        const currentIndex = this.currentSearchTreeElements.length - 1;
        if (hasMatch || jumpBackwards) {
          newIndex = currentIndex;
        } else {
          newIndex = currentIndex + 1;
        }
      }
    }
    this.updateSearchCount(this.currentSearchTreeElements.length);
    if (!this.currentSearchTreeElements.length) {
      this.updateSearchIndex(-1);
      return;
    }
    newIndex = Platform.NumberUtilities.mod(newIndex, this.currentSearchTreeElements.length);
    this.jumpToMatch(newIndex);
  }
  jumpToNextSearchResult() {
    if (!this.currentSearchTreeElements.length) {
      return;
    }
    const newIndex = Platform.NumberUtilities.mod(this.currentSearchFocusIndex + 1, this.currentSearchTreeElements.length);
    this.jumpToMatch(newIndex);
  }
  jumpToPreviousSearchResult() {
    if (!this.currentSearchTreeElements.length) {
      return;
    }
    const newIndex = Platform.NumberUtilities.mod(this.currentSearchFocusIndex - 1, this.currentSearchTreeElements.length);
    this.jumpToMatch(newIndex);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
}
export class ParsedJSON {
  data;
  prefix;
  suffix;
  constructor(data, prefix, suffix) {
    this.data = data;
    this.prefix = prefix;
    this.suffix = suffix;
  }
}
//# sourceMappingURL=JSONView.js.map
