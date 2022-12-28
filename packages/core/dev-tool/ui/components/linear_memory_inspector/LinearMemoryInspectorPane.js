import * as Common from "../../../core/common/common.js";
import * as i18n from "../../../core/i18n/i18n.js";
import * as UI from "../../legacy/legacy.js";
import {
  AddressChangedEvent,
  LinearMemoryInspector,
  MemoryRequestEvent,
  SettingsChangedEvent
} from "./LinearMemoryInspector.js";
import { LinearMemoryInspectorController } from "./LinearMemoryInspectorController.js";
import { DeleteMemoryHighlightEvent } from "./LinearMemoryHighlightChipList.js";
const UIStrings = {
  noOpenInspections: "No open inspections"
};
const str_ = i18n.i18n.registerUIStrings("ui/components/linear_memory_inspector/LinearMemoryInspectorPane.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
let inspectorInstance;
let wrapperInstance;
export class Wrapper extends UI.Widget.VBox {
  view;
  constructor() {
    super();
    this.view = LinearMemoryInspectorPaneImpl.instance();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!wrapperInstance || forceNew) {
      wrapperInstance = new Wrapper();
    }
    return wrapperInstance;
  }
  wasShown() {
    this.view.show(this.contentElement);
  }
}
export class LinearMemoryInspectorPaneImpl extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
  #tabbedPane;
  #tabIdToInspectorView;
  constructor() {
    super(false);
    const placeholder = document.createElement("div");
    placeholder.textContent = i18nString(UIStrings.noOpenInspections);
    placeholder.style.display = "flex";
    this.#tabbedPane = new UI.TabbedPane.TabbedPane();
    this.#tabbedPane.setPlaceholderElement(placeholder);
    this.#tabbedPane.setCloseableTabs(true);
    this.#tabbedPane.setAllowTabReorder(true, true);
    this.#tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this.#tabClosed, this);
    this.#tabbedPane.show(this.contentElement);
    this.#tabIdToInspectorView = /* @__PURE__ */ new Map();
  }
  static instance() {
    if (!inspectorInstance) {
      inspectorInstance = new LinearMemoryInspectorPaneImpl();
    }
    return inspectorInstance;
  }
  getViewForTabId(tabId) {
    const view = this.#tabIdToInspectorView.get(tabId);
    if (!view) {
      throw new Error(`No linear memory inspector view for the given tab id: ${tabId}`);
    }
    return view;
  }
  create(tabId, title, arrayWrapper, address) {
    const inspectorView = new LinearMemoryInspectorView(arrayWrapper, address, tabId);
    this.#tabIdToInspectorView.set(tabId, inspectorView);
    this.#tabbedPane.appendTab(tabId, title, inspectorView, void 0, false, true);
    this.#tabbedPane.selectTab(tabId);
  }
  close(tabId) {
    this.#tabbedPane.closeTab(tabId, false);
  }
  reveal(tabId, address) {
    const view = this.getViewForTabId(tabId);
    if (address !== void 0) {
      view.updateAddress(address);
    }
    this.refreshView(tabId);
    this.#tabbedPane.selectTab(tabId);
  }
  refreshView(tabId) {
    const view = this.getViewForTabId(tabId);
    view.refreshData();
  }
  #tabClosed(event) {
    const { tabId } = event.data;
    this.#tabIdToInspectorView.delete(tabId);
    this.dispatchEventToListeners(Events.ViewClosed, tabId);
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["ViewClosed"] = "ViewClosed";
  return Events2;
})(Events || {});
class LinearMemoryInspectorView extends UI.Widget.VBox {
  #memoryWrapper;
  #address;
  #tabId;
  #inspector;
  firstTimeOpen;
  constructor(memoryWrapper, address = 0, tabId) {
    super(false);
    if (address < 0 || address >= memoryWrapper.length()) {
      throw new Error("Requested address is out of bounds.");
    }
    this.#memoryWrapper = memoryWrapper;
    this.#address = address;
    this.#tabId = tabId;
    this.#inspector = new LinearMemoryInspector();
    this.#inspector.addEventListener(MemoryRequestEvent.eventName, (event) => {
      this.#memoryRequested(event);
    });
    this.#inspector.addEventListener(AddressChangedEvent.eventName, (event) => {
      this.updateAddress(event.data);
    });
    this.#inspector.addEventListener(SettingsChangedEvent.eventName, (event) => {
      event.stopPropagation();
      this.saveSettings(event.data);
    });
    this.#inspector.addEventListener(DeleteMemoryHighlightEvent.eventName, (event) => {
      LinearMemoryInspectorController.instance().removeHighlight(this.#tabId, event.data);
      this.refreshData();
    });
    this.contentElement.appendChild(this.#inspector);
    this.firstTimeOpen = true;
  }
  wasShown() {
    this.refreshData();
  }
  saveSettings(settings) {
    LinearMemoryInspectorController.instance().saveSettings(settings);
  }
  updateAddress(address) {
    if (address < 0 || address >= this.#memoryWrapper.length()) {
      throw new Error("Requested address is out of bounds.");
    }
    this.#address = address;
  }
  refreshData() {
    void LinearMemoryInspectorController.getMemoryForAddress(this.#memoryWrapper, this.#address).then(({
      memory,
      offset
    }) => {
      let valueTypes;
      let valueTypeModes;
      let endianness;
      if (this.firstTimeOpen) {
        const settings = LinearMemoryInspectorController.instance().loadSettings();
        valueTypes = settings.valueTypes;
        valueTypeModes = settings.modes;
        endianness = settings.endianness;
        this.firstTimeOpen = false;
      }
      this.#inspector.data = {
        memory,
        address: this.#address,
        memoryOffset: offset,
        outerMemoryLength: this.#memoryWrapper.length(),
        valueTypes,
        valueTypeModes,
        endianness,
        highlightInfo: this.#getHighlightInfo()
      };
    });
  }
  #memoryRequested(event) {
    const { start, end, address } = event.data;
    if (address < start || address >= end) {
      throw new Error("Requested address is out of bounds.");
    }
    void LinearMemoryInspectorController.getMemoryRange(this.#memoryWrapper, start, end).then((memory) => {
      this.#inspector.data = {
        memory,
        address,
        memoryOffset: start,
        outerMemoryLength: this.#memoryWrapper.length(),
        highlightInfo: this.#getHighlightInfo()
      };
    });
  }
  #getHighlightInfo() {
    const highlightInfo = LinearMemoryInspectorController.instance().getHighlightInfo(this.#tabId);
    if (highlightInfo !== void 0) {
      if (highlightInfo.startAddress < 0 || highlightInfo.startAddress >= this.#memoryWrapper.length()) {
        throw new Error("HighlightInfo start address is out of bounds.");
      }
      if (highlightInfo.size <= 0) {
        throw new Error("Highlight size must be a positive number.");
      }
    }
    return highlightInfo;
  }
}
//# sourceMappingURL=LinearMemoryInspectorPane.js.map
