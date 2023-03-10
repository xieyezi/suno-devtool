import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as DataGrid from "../../ui/legacy/components/data_grid/data_grid.js";
import * as SourceFrame from "../../ui/legacy/components/source_frame/source_frame.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as ApplicationComponents from "./components/components.js";
import { SharedStorageForOrigin } from "./SharedStorageModel.js";
import { StorageItemsView } from "./StorageItemsView.js";
const UIStrings = {
  sharedStorage: "Shared Storage",
  key: "Key",
  value: "Value",
  sharedStorageItems: "Shared Storage Items",
  sharedStorageItemsCleared: "Shared Storage items cleared",
  sharedStorageFilteredItemsCleared: "Shared Storage filtered items cleared",
  selectAValueToPreview: "Select a value to preview",
  sharedStorageItemDeleted: "The storage item was deleted.",
  sharedStorageItemEdited: "The storage item was edited.",
  sharedStorageItemEditCanceled: "The storage item edit was canceled.",
  sharedStorageNumberEntries: "Number of entries shown in table: {PH1}"
};
const str_ = i18n.i18n.registerUIStrings("panels/application/SharedStorageItemsView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export var SharedStorageItemsDispatcher;
((SharedStorageItemsDispatcher2) => {
  let Events;
  ((Events2) => {
    Events2["FilteredItemsCleared"] = "FilteredItemsCleared";
    Events2["ItemDeleted"] = "ItemDeleted";
    Events2["ItemEdited"] = "ItemEdited";
    Events2["ItemsCleared"] = "ItemsCleared";
    Events2["ItemsRefreshed"] = "ItemsRefreshed";
  })(Events = SharedStorageItemsDispatcher2.Events || (SharedStorageItemsDispatcher2.Events = {}));
})(SharedStorageItemsDispatcher || (SharedStorageItemsDispatcher = {}));
export class SharedStorageItemsView extends StorageItemsView {
  #sharedStorage;
  outerSplitWidget;
  innerSplitWidget;
  #metadataView;
  dataGrid;
  #noDisplayView;
  #eventListeners;
  sharedStorageItemsDispatcher;
  constructor(sharedStorage) {
    super(i18nString(UIStrings.sharedStorage), "sharedStoragePanel");
    this.#sharedStorage = sharedStorage;
    this.element.classList.add("storage-view", "table");
    const columns = [
      { id: "key", title: i18nString(UIStrings.key), sortable: false, editable: true, longText: true, weight: 50 },
      { id: "value", title: i18nString(UIStrings.value), sortable: false, editable: true, longText: true, weight: 50 }
    ];
    this.dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.sharedStorageItems),
      columns,
      editCallback: this.#editingCallback.bind(this),
      deleteCallback: this.#deleteCallback.bind(this),
      refreshCallback: this.refreshItems.bind(this)
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, (event) => {
      void this.#previewEntry(event.data);
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, () => {
      void this.#previewEntry(null);
    });
    this.dataGrid.setStriped(true);
    this.dataGrid.setName("SharedStorageItemsView");
    const dataGridWidget = this.dataGrid.asWidget();
    dataGridWidget.setMinimumSize(0, 100);
    this.#metadataView = new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataView(sharedStorage, sharedStorage.securityOrigin);
    this.#metadataView.setMinimumSize(0, 275);
    const innerResizer = this.#metadataView.element.createChild("div", "metadata-view-resizer");
    this.innerSplitWidget = new UI.SplitWidget.SplitWidget(false, false, "sharedStorageInnerSplitViewState");
    this.innerSplitWidget.setSidebarWidget(this.#metadataView);
    this.innerSplitWidget.setMainWidget(dataGridWidget);
    this.innerSplitWidget.installResizer(innerResizer);
    this.#noDisplayView = new UI.Widget.VBox();
    this.#noDisplayView.setMinimumSize(0, 25);
    const outerResizer = this.#noDisplayView.element.createChild("div", "preview-panel-resizer");
    this.outerSplitWidget = new UI.SplitWidget.SplitWidget(false, true, "sharedStorageOuterSplitViewState");
    this.outerSplitWidget.show(this.element);
    this.outerSplitWidget.setMainWidget(this.innerSplitWidget);
    this.outerSplitWidget.setSidebarWidget(this.#noDisplayView);
    this.outerSplitWidget.installResizer(outerResizer);
    this.#noDisplayView.contentElement.classList.add("placeholder");
    const noDisplayDiv = this.#noDisplayView.contentElement.createChild("div");
    noDisplayDiv.textContent = i18nString(UIStrings.selectAValueToPreview);
    this.#eventListeners = [];
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#sharedStorage = sharedStorage;
    this.#eventListeners = [
      this.#sharedStorage.addEventListener(SharedStorageForOrigin.Events.SharedStorageChanged, this.#sharedStorageChanged, this)
    ];
    this.sharedStorageItemsDispatcher = new Common.ObjectWrapper.ObjectWrapper();
  }
  static async createView(sharedStorage) {
    const view = new SharedStorageItemsView(sharedStorage);
    await view.updateEntriesOnly();
    return view;
  }
  async updateEntriesOnly() {
    if (!this.isShowing()) {
      return;
    }
    const entries = await this.#sharedStorage.getEntries();
    if (entries) {
      this.#showSharedStorageItems(entries);
    }
  }
  async #sharedStorageChanged() {
    await this.refreshItems();
  }
  async refreshItems() {
    if (!this.isShowing()) {
      return;
    }
    await this.#metadataView.doUpdate();
    await this.updateEntriesOnly();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemsRefreshed" /* ItemsRefreshed */);
  }
  async deleteSelectedItem() {
    if (!this.dataGrid.selectedNode) {
      return;
    }
    await this.#deleteCallback(this.dataGrid.selectedNode);
  }
  async deleteAllItems() {
    if (!this.hasFilter()) {
      await this.#sharedStorage.clear();
      await this.refreshItems();
      this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemsCleared" /* ItemsCleared */);
      UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemsCleared));
      return;
    }
    await Promise.all(this.dataGrid.rootNode().children.filter((node) => node.data.key).map((node) => this.#sharedStorage.deleteEntry(node.data.key)));
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners("FilteredItemsCleared" /* FilteredItemsCleared */);
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageFilteredItemsCleared));
  }
  async #editingCallback(editingNode, columnIdentifier, oldText, newText) {
    if (columnIdentifier === "key" && newText === "") {
      await this.refreshItems();
      UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemEditCanceled));
      return;
    }
    if (columnIdentifier === "key") {
      await this.#sharedStorage.deleteEntry(oldText);
      await this.#sharedStorage.setEntry(newText, editingNode.data.value || "", false);
    } else {
      await this.#sharedStorage.setEntry(editingNode.data.key || " ", newText, false);
    }
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemEdited" /* ItemEdited */, { columnIdentifier, oldText, newText });
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemEdited));
  }
  #showSharedStorageItems(items) {
    const rootNode = this.dataGrid.rootNode();
    const [selectedKey] = rootNode.children.filter((node) => node.selected).map((node) => node.data.key);
    rootNode.removeChildren();
    let selectedNode = null;
    const filteredItems = (item) => `${item.key} ${item.value}`;
    const filteredList = this.filter(items, filteredItems);
    for (const item of filteredList) {
      const node = new DataGrid.DataGrid.DataGridNode({ key: item.key, value: item.value }, false);
      node.selectable = true;
      rootNode.appendChild(node);
      if (!selectedNode || item.key === selectedKey) {
        selectedNode = node;
      }
    }
    if (selectedNode) {
      selectedNode.selected = true;
    }
    this.dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(Boolean(selectedNode));
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageNumberEntries, { PH1: filteredList.length }));
  }
  async #deleteCallback(node) {
    if (!node || node.isCreationNode || !this.#sharedStorage) {
      return;
    }
    const key = node.data.key;
    await this.#sharedStorage.deleteEntry(key);
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemDeleted" /* ItemDeleted */, { key });
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemDeleted));
  }
  async #previewEntry(entry) {
    const key = entry?.data?.key;
    const value = entry?.data?.value;
    const wrappedEntry = key && { key, value: value || "" };
    if (wrappedEntry) {
      const preview = SourceFrame.JSONView.JSONView.createViewSync(wrappedEntry);
      if (entry.selected) {
        this.outerSplitWidget.setSidebarWidget(preview);
      }
    } else {
      this.outerSplitWidget.setSidebarWidget(this.#noDisplayView);
    }
  }
  getEntriesForTesting() {
    return this.dataGrid.rootNode().children.filter((node) => node.data.key).map((node) => node.data);
  }
}
//# sourceMappingURL=SharedStorageItemsView.js.map
