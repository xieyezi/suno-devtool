import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as Adorners from "../../ui/components/adorners/adorners.js";
import * as CodeHighlighter from "../../ui/components/code_highlighter/code_highlighter.js";
import * as IconButton from "../../ui/components/icon_button/icon_button.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as ElementsComponents from "./components/components.js";
import { ElementsPanel } from "./ElementsPanel.js";
import { ElementsTreeElement, InitialChildrenLimit } from "./ElementsTreeElement.js";
import elementsTreeOutlineStyles from "./elementsTreeOutline.css.js";
import { ImagePreviewPopover } from "./ImagePreviewPopover.js";
import { TopLayerContainer } from "./TopLayerContainer.js";
const UIStrings = {
  pageDom: "Page DOM",
  storeAsGlobalVariable: "Store as global variable",
  showAllNodesDMore: "Show All Nodes ({PH1} More)",
  reveal: "reveal",
  adornerSettings: "Badge settings\u2026"
};
const str_ = i18n.i18n.registerUIStrings("panels/elements/ElementsTreeOutline.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
const elementsTreeOutlineByDOMModel = /* @__PURE__ */ new WeakMap();
const populatedTreeElements = /* @__PURE__ */ new Set();
export class ElementsTreeOutline extends Common.ObjectWrapper.eventMixin(UI.TreeOutline.TreeOutline) {
  treeElementByNode;
  shadowRoot;
  elementInternal;
  includeRootDOMNode;
  selectEnabled;
  rootDOMNodeInternal;
  selectedDOMNodeInternal;
  visible;
  imagePreviewPopover;
  updateRecords;
  treeElementsBeingUpdated;
  decoratorExtensions;
  showHTMLCommentsSetting;
  multilineEditing;
  visibleWidthInternal;
  clipboardNodeData;
  isXMLMimeTypeInternal;
  suppressRevealAndSelect = false;
  previousHoveredElement;
  treeElementBeingDragged;
  dragOverTreeElement;
  updateModifiedNodesTimeout;
  #topLayerContainerByParent = /* @__PURE__ */ new Map();
  constructor(omitRootDOMNode, selectEnabled, hideGutter) {
    super();
    this.treeElementByNode = /* @__PURE__ */ new WeakMap();
    const shadowContainer = document.createElement("div");
    this.shadowRoot = UI.Utils.createShadowRootWithCoreStyles(shadowContainer, { cssFile: [elementsTreeOutlineStyles, CodeHighlighter.Style.default], delegatesFocus: void 0 });
    const outlineDisclosureElement = this.shadowRoot.createChild("div", "elements-disclosure");
    this.elementInternal = this.element;
    this.elementInternal.classList.add("elements-tree-outline", "source-code");
    if (hideGutter) {
      this.elementInternal.classList.add("elements-hide-gutter");
    }
    UI.ARIAUtils.setAccessibleName(this.elementInternal, i18nString(UIStrings.pageDom));
    this.elementInternal.addEventListener("focusout", this.onfocusout.bind(this), false);
    this.elementInternal.addEventListener("mousedown", this.onmousedown.bind(this), false);
    this.elementInternal.addEventListener("mousemove", this.onmousemove.bind(this), false);
    this.elementInternal.addEventListener("mouseleave", this.onmouseleave.bind(this), false);
    this.elementInternal.addEventListener("dragstart", this.ondragstart.bind(this), false);
    this.elementInternal.addEventListener("dragover", this.ondragover.bind(this), false);
    this.elementInternal.addEventListener("dragleave", this.ondragleave.bind(this), false);
    this.elementInternal.addEventListener("drop", this.ondrop.bind(this), false);
    this.elementInternal.addEventListener("dragend", this.ondragend.bind(this), false);
    this.elementInternal.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), false);
    this.elementInternal.addEventListener("clipboard-beforecopy", this.onBeforeCopy.bind(this), false);
    this.elementInternal.addEventListener("clipboard-copy", this.onCopyOrCut.bind(this, false), false);
    this.elementInternal.addEventListener("clipboard-cut", this.onCopyOrCut.bind(this, true), false);
    this.elementInternal.addEventListener("clipboard-paste", this.onPaste.bind(this), false);
    this.elementInternal.addEventListener("keydown", this.onKeyDown.bind(this), false);
    outlineDisclosureElement.appendChild(this.elementInternal);
    this.element = shadowContainer;
    this.includeRootDOMNode = !omitRootDOMNode;
    this.selectEnabled = selectEnabled;
    this.rootDOMNodeInternal = null;
    this.selectedDOMNodeInternal = null;
    this.visible = false;
    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, (event) => {
      let link = event.target;
      while (link && !ImagePreviewPopover.getImageURL(link)) {
        link = link.parentElementOrShadowHost();
      }
      return link;
    }, (link) => {
      const listItem = UI.UIUtils.enclosingNodeOrSelfWithNodeName(link, "li");
      if (!listItem) {
        return null;
      }
      const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
      if (!treeElement) {
        return null;
      }
      return treeElement.node();
    });
    this.updateRecords = /* @__PURE__ */ new Map();
    this.treeElementsBeingUpdated = /* @__PURE__ */ new Set();
    this.decoratorExtensions = null;
    this.showHTMLCommentsSetting = Common.Settings.Settings.instance().moduleSetting("showHTMLComments");
    this.showHTMLCommentsSetting.addChangeListener(this.onShowHTMLCommentsChange.bind(this));
    this.setUseLightSelectionColor(true);
  }
  static forDOMModel(domModel) {
    return elementsTreeOutlineByDOMModel.get(domModel) || null;
  }
  onShowHTMLCommentsChange() {
    const selectedNode = this.selectedDOMNode();
    if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this.showHTMLCommentsSetting.get()) {
      this.selectDOMNode(selectedNode.parentNode);
    }
    this.update();
  }
  setWordWrap(wrap) {
    this.elementInternal.classList.toggle("elements-tree-nowrap", !wrap);
  }
  setMultilineEditing(multilineEditing) {
    this.multilineEditing = multilineEditing;
  }
  visibleWidth() {
    return this.visibleWidthInternal || 0;
  }
  setVisibleWidth(width) {
    this.visibleWidthInternal = width;
    if (this.multilineEditing) {
      this.multilineEditing.resize();
    }
  }
  setClipboardData(data) {
    if (this.clipboardNodeData) {
      const treeElement = this.findTreeElement(this.clipboardNodeData.node);
      if (treeElement) {
        treeElement.setInClipboard(false);
      }
      delete this.clipboardNodeData;
    }
    if (data) {
      const treeElement = this.findTreeElement(data.node);
      if (treeElement) {
        treeElement.setInClipboard(true);
      }
      this.clipboardNodeData = data;
    }
  }
  resetClipboardIfNeeded(removedNode) {
    if (this.clipboardNodeData && this.clipboardNodeData.node === removedNode) {
      this.setClipboardData(null);
    }
  }
  onBeforeCopy(event) {
    event.handled = true;
  }
  onCopyOrCut(isCut, event) {
    this.setClipboardData(null);
    const originalEvent = event["original"];
    if (!originalEvent || !originalEvent.target) {
      return;
    }
    if (originalEvent.target instanceof Node && originalEvent.target.hasSelection()) {
      return;
    }
    if (UI.UIUtils.isEditing()) {
      return;
    }
    const targetNode = this.selectedDOMNode();
    if (!targetNode) {
      return;
    }
    if (!originalEvent.clipboardData) {
      return;
    }
    originalEvent.clipboardData.clearData();
    event.handled = true;
    this.performCopyOrCut(isCut, targetNode);
  }
  performCopyOrCut(isCut, node) {
    if (!node) {
      return;
    }
    if (isCut && (node.isShadowRoot() || node.ancestorUserAgentShadowRoot())) {
      return;
    }
    void node.copyNode();
    this.setClipboardData({ node, isCut });
  }
  canPaste(targetNode) {
    if (targetNode.isShadowRoot() || targetNode.ancestorUserAgentShadowRoot()) {
      return false;
    }
    if (!this.clipboardNodeData) {
      return false;
    }
    const node = this.clipboardNodeData.node;
    if (this.clipboardNodeData.isCut && (node === targetNode || node.isAncestor(targetNode))) {
      return false;
    }
    if (targetNode.domModel() !== node.domModel()) {
      return false;
    }
    return true;
  }
  pasteNode(targetNode) {
    if (this.canPaste(targetNode)) {
      this.performPaste(targetNode);
    }
  }
  duplicateNode(targetNode) {
    this.performDuplicate(targetNode);
  }
  onPaste(event) {
    if (UI.UIUtils.isEditing()) {
      return;
    }
    const targetNode = this.selectedDOMNode();
    if (!targetNode || !this.canPaste(targetNode)) {
      return;
    }
    event.handled = true;
    this.performPaste(targetNode);
  }
  performPaste(targetNode) {
    if (!this.clipboardNodeData) {
      return;
    }
    if (this.clipboardNodeData.isCut) {
      this.clipboardNodeData.node.moveTo(targetNode, null, expandCallback.bind(this));
      this.setClipboardData(null);
    } else {
      this.clipboardNodeData.node.copyTo(targetNode, null, expandCallback.bind(this));
    }
    function expandCallback(error, pastedNode) {
      if (error || !pastedNode) {
        return;
      }
      this.selectDOMNode(pastedNode);
    }
  }
  performDuplicate(targetNode) {
    if (targetNode.isInShadowTree()) {
      return;
    }
    const parentNode = targetNode.parentNode ? targetNode.parentNode : targetNode;
    if (parentNode.nodeName() === "#document") {
      return;
    }
    targetNode.copyTo(parentNode, targetNode.nextSibling);
  }
  setVisible(visible) {
    if (visible === this.visible) {
      return;
    }
    this.visible = visible;
    if (!this.visible) {
      this.imagePreviewPopover.hide();
      if (this.multilineEditing) {
        this.multilineEditing.cancel();
      }
      return;
    }
    this.runPendingUpdates();
    if (this.selectedDOMNodeInternal) {
      this.revealAndSelectNode(this.selectedDOMNodeInternal, false);
    }
  }
  get rootDOMNode() {
    return this.rootDOMNodeInternal;
  }
  set rootDOMNode(x) {
    if (this.rootDOMNodeInternal === x) {
      return;
    }
    this.rootDOMNodeInternal = x;
    this.isXMLMimeTypeInternal = x && x.isXMLNode();
    this.update();
  }
  get isXMLMimeType() {
    return Boolean(this.isXMLMimeTypeInternal);
  }
  selectedDOMNode() {
    return this.selectedDOMNodeInternal;
  }
  selectDOMNode(node, focus) {
    if (this.selectedDOMNodeInternal === node) {
      this.revealAndSelectNode(node, !focus);
      return;
    }
    this.selectedDOMNodeInternal = node;
    this.revealAndSelectNode(node, !focus);
    if (this.selectedDOMNodeInternal === node) {
      this.selectedNodeChanged(Boolean(focus));
    }
  }
  editing() {
    const node = this.selectedDOMNode();
    if (!node) {
      return false;
    }
    const treeElement = this.findTreeElement(node);
    if (!treeElement) {
      return false;
    }
    return treeElement.isEditing() || false;
  }
  update() {
    const selectedNode = this.selectedDOMNode();
    this.removeChildren();
    if (!this.rootDOMNode) {
      return;
    }
    if (this.includeRootDOMNode) {
      const treeElement = this.createElementTreeElement(this.rootDOMNode);
      this.appendChild(treeElement);
    } else {
      const children = this.visibleChildren(this.rootDOMNode);
      for (const child of children) {
        const treeElement = this.createElementTreeElement(child);
        this.appendChild(treeElement);
      }
    }
    void this.createTopLayerContainer(this.rootElement(), this.rootDOMNode.domModel());
    if (selectedNode) {
      this.revealAndSelectNode(selectedNode, true);
    }
  }
  selectedNodeChanged(focus) {
    this.dispatchEventToListeners(ElementsTreeOutline.Events.SelectedNodeChanged, { node: this.selectedDOMNodeInternal, focus });
  }
  fireElementsTreeUpdated(nodes) {
    this.dispatchEventToListeners(ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
  }
  findTreeElement(node) {
    let treeElement = this.lookUpTreeElement(node);
    if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
      treeElement = this.lookUpTreeElement(node.parentNode);
    }
    return treeElement;
  }
  lookUpTreeElement(node) {
    if (!node) {
      return null;
    }
    const cachedElement = this.treeElementByNode.get(node);
    if (cachedElement) {
      return cachedElement;
    }
    const ancestors = [];
    let currentNode;
    for (currentNode = node.parentNode; currentNode; currentNode = currentNode.parentNode) {
      ancestors.push(currentNode);
      if (this.treeElementByNode.has(currentNode)) {
        break;
      }
    }
    if (!currentNode) {
      return null;
    }
    for (let i = ancestors.length - 1; i >= 0; --i) {
      const child = ancestors[i - 1] || node;
      const treeElement = this.treeElementByNode.get(ancestors[i]);
      if (treeElement) {
        void treeElement.onpopulate();
        if (child.index && child.index >= treeElement.expandedChildrenLimit()) {
          this.setExpandedChildrenLimit(treeElement, child.index + 1);
        }
      }
    }
    return this.treeElementByNode.get(node) || null;
  }
  createTreeElementFor(node) {
    let treeElement = this.findTreeElement(node);
    if (treeElement) {
      return treeElement;
    }
    if (!node.parentNode) {
      return null;
    }
    treeElement = this.createTreeElementFor(node.parentNode);
    return treeElement ? this.showChild(treeElement, node) : null;
  }
  revealAndSelectNode(node, omitFocus) {
    if (this.suppressRevealAndSelect) {
      return;
    }
    if (!this.includeRootDOMNode && node === this.rootDOMNode && this.rootDOMNode) {
      node = this.rootDOMNode.firstChild;
    }
    if (!node) {
      return;
    }
    const treeElement = this.createTreeElementFor(node);
    if (!treeElement) {
      return;
    }
    treeElement.revealAndSelect(omitFocus);
  }
  treeElementFromEventInternal(event) {
    const scrollContainer = this.element.parentElement;
    if (!scrollContainer) {
      return null;
    }
    const x = event.pageX;
    const y = event.pageY;
    const elementUnderMouse = this.treeElementFromPoint(x, y);
    const elementAboveMouse = this.treeElementFromPoint(x, y - 2);
    let element;
    if (elementUnderMouse === elementAboveMouse) {
      element = elementUnderMouse;
    } else {
      element = this.treeElementFromPoint(x, y + 2);
    }
    return element;
  }
  onfocusout(_event) {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
  onmousedown(event) {
    const element = this.treeElementFromEventInternal(event);
    if (element) {
      element.select();
    }
  }
  setHoverEffect(treeElement) {
    if (this.previousHoveredElement === treeElement) {
      return;
    }
    if (this.previousHoveredElement instanceof ElementsTreeElement) {
      this.previousHoveredElement.hovered = false;
      delete this.previousHoveredElement;
    }
    if (treeElement instanceof ElementsTreeElement) {
      treeElement.hovered = true;
      this.previousHoveredElement = treeElement;
    }
  }
  onmousemove(event) {
    const element = this.treeElementFromEventInternal(event);
    if (element && this.previousHoveredElement === element) {
      return;
    }
    this.setHoverEffect(element);
    this.highlightTreeElement(element, !UI.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event));
  }
  highlightTreeElement(element, showInfo) {
    if (element instanceof ElementsTreeElement) {
      element.node().domModel().overlayModel().highlightInOverlay({ node: element.node(), selectorList: void 0 }, "all", showInfo);
      return;
    }
    if (element instanceof ShortcutTreeElement) {
      element.domModel().overlayModel().highlightInOverlay({ deferredNode: element.deferredNode(), selectorList: void 0 }, "all", showInfo);
    }
  }
  onmouseleave(_event) {
    this.setHoverEffect(null);
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
  ondragstart(event) {
    const node = event.target;
    if (!node || node.hasSelection()) {
      return false;
    }
    if (node.nodeName === "A") {
      return false;
    }
    const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
    if (!treeElement) {
      return false;
    }
    if (treeElement.node().nodeName() === "BODY" || treeElement.node().nodeName() === "HEAD") {
      return false;
    }
    if (!event.dataTransfer || !treeElement.listItemElement.textContent) {
      return;
    }
    event.dataTransfer.setData("text/plain", treeElement.listItemElement.textContent.replace(/\u200b/g, ""));
    event.dataTransfer.effectAllowed = "copyMove";
    this.treeElementBeingDragged = treeElement;
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return true;
  }
  ondragover(event) {
    if (!this.treeElementBeingDragged) {
      return false;
    }
    const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
    if (!treeElement) {
      return false;
    }
    let node = treeElement.node();
    while (node) {
      if (node === this.treeElementBeingDragged.nodeInternal) {
        return false;
      }
      node = node.parentNode;
    }
    treeElement.listItemElement.classList.add("elements-drag-over");
    this.dragOverTreeElement = treeElement;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    return false;
  }
  ondragleave(event) {
    this.clearDragOverTreeElementMarker();
    event.preventDefault();
    return false;
  }
  validDragSourceOrTarget(treeElement) {
    if (!treeElement) {
      return null;
    }
    if (!(treeElement instanceof ElementsTreeElement)) {
      return null;
    }
    const elementsTreeElement = treeElement;
    const node = elementsTreeElement.node();
    if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE) {
      return null;
    }
    return elementsTreeElement;
  }
  ondrop(event) {
    event.preventDefault();
    const treeElement = this.treeElementFromEventInternal(event);
    if (treeElement instanceof ElementsTreeElement) {
      this.doMove(treeElement);
    }
  }
  doMove(treeElement) {
    if (!this.treeElementBeingDragged) {
      return;
    }
    let parentNode;
    let anchorNode;
    if (treeElement.isClosingTag()) {
      parentNode = treeElement.node();
    } else {
      const dragTargetNode = treeElement.node();
      parentNode = dragTargetNode.parentNode;
      anchorNode = dragTargetNode;
    }
    if (!parentNode || !anchorNode) {
      return;
    }
    const wasExpanded = this.treeElementBeingDragged.expanded;
    this.treeElementBeingDragged.nodeInternal.moveTo(parentNode, anchorNode, this.selectNodeAfterEdit.bind(this, wasExpanded));
    delete this.treeElementBeingDragged;
  }
  ondragend(event) {
    event.preventDefault();
    this.clearDragOverTreeElementMarker();
    delete this.treeElementBeingDragged;
  }
  clearDragOverTreeElementMarker() {
    if (this.dragOverTreeElement) {
      this.dragOverTreeElement.listItemElement.classList.remove("elements-drag-over");
      delete this.dragOverTreeElement;
    }
  }
  contextMenuEventFired(event) {
    const treeElement = this.treeElementFromEventInternal(event);
    if (treeElement instanceof ElementsTreeElement) {
      this.showContextMenu(treeElement, event);
    }
  }
  showContextMenu(treeElement, event) {
    if (UI.UIUtils.isEditing()) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const isPseudoElement = Boolean(treeElement.node().pseudoType());
    const isTag = treeElement.node().nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
    const node = event.target;
    if (!node) {
      return;
    }
    let textNode = node.enclosingNodeOrSelfWithClass("webkit-html-text-node");
    if (textNode && textNode.classList.contains("bogus")) {
      textNode = null;
    }
    const commentNode = node.enclosingNodeOrSelfWithClass("webkit-html-comment");
    contextMenu.saveSection().appendItem(i18nString(UIStrings.storeAsGlobalVariable), this.saveNodeToTempVariable.bind(this, treeElement.node()));
    if (textNode) {
      treeElement.populateTextContextMenu(contextMenu, textNode);
    } else if (isTag) {
      treeElement.populateTagContextMenu(contextMenu, event);
    } else if (commentNode) {
      treeElement.populateNodeContextMenu(contextMenu);
    } else if (isPseudoElement) {
      treeElement.populateScrollIntoView(contextMenu);
    }
    contextMenu.viewSection().appendItem(i18nString(UIStrings.adornerSettings), () => {
      ElementsPanel.instance().showAdornerSettingsPane();
    });
    contextMenu.appendApplicableItems(treeElement.node());
    void contextMenu.show();
  }
  async saveNodeToTempVariable(node) {
    const remoteObjectForConsole = await node.resolveToObject();
    await SDK.ConsoleModel.ConsoleModel.instance().saveToTempVariable(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), remoteObjectForConsole);
  }
  runPendingUpdates() {
    this.updateModifiedNodes();
  }
  onKeyDown(event) {
    const keyboardEvent = event;
    if (UI.UIUtils.isEditing()) {
      return;
    }
    const node = this.selectedDOMNode();
    if (!node) {
      return;
    }
    const treeElement = this.treeElementByNode.get(node);
    if (!treeElement) {
      return;
    }
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(keyboardEvent) && node.parentNode) {
      if (keyboardEvent.key === "ArrowUp" && node.previousSibling) {
        node.moveTo(node.parentNode, node.previousSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
        keyboardEvent.consume(true);
        return;
      }
      if (keyboardEvent.key === "ArrowDown" && node.nextSibling) {
        node.moveTo(node.parentNode, node.nextSibling.nextSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
        keyboardEvent.consume(true);
        return;
      }
    }
  }
  toggleEditAsHTML(node, startEditing, callback) {
    const treeElement = this.treeElementByNode.get(node);
    if (!treeElement || !treeElement.hasEditableNode()) {
      return;
    }
    if (node.pseudoType()) {
      return;
    }
    const parentNode = node.parentNode;
    const index = node.index;
    const wasExpanded = treeElement.expanded;
    treeElement.toggleEditAsHTML(editingFinished.bind(this), startEditing);
    function editingFinished(success) {
      if (callback) {
        callback();
      }
      if (!success) {
        return;
      }
      this.runPendingUpdates();
      if (!index) {
        return;
      }
      const children = parentNode && parentNode.children();
      const newNode = children ? children[index] || parentNode : parentNode;
      if (!newNode) {
        return;
      }
      this.selectDOMNode(newNode, true);
      if (wasExpanded) {
        const newTreeItem = this.findTreeElement(newNode);
        if (newTreeItem) {
          newTreeItem.expand();
        }
      }
    }
  }
  selectNodeAfterEdit(wasExpanded, error, newNode) {
    if (error) {
      return null;
    }
    this.runPendingUpdates();
    if (!newNode) {
      return null;
    }
    this.selectDOMNode(newNode, true);
    const newTreeItem = this.findTreeElement(newNode);
    if (wasExpanded) {
      if (newTreeItem) {
        newTreeItem.expand();
      }
    }
    return newTreeItem;
  }
  async toggleHideElement(node) {
    const pseudoType = node.pseudoType();
    const effectiveNode = pseudoType ? node.parentNode : node;
    if (!effectiveNode) {
      return;
    }
    const hidden = node.marker("hidden-marker");
    const object = await effectiveNode.resolveToObject("");
    if (!object) {
      return;
    }
    await object.callFunction(toggleClassAndInjectStyleRule, [{ value: pseudoType }, { value: !hidden }]);
    object.release();
    node.setMarker("hidden-marker", hidden ? null : true);
    function toggleClassAndInjectStyleRule(pseudoType2, hidden2) {
      const classNamePrefix = "__web-inspector-hide";
      const classNameSuffix = "-shortcut__";
      const styleTagId = "__web-inspector-hide-shortcut-style__";
      const selectors = [];
      selectors.push(".__web-inspector-hide-shortcut__");
      selectors.push(".__web-inspector-hide-shortcut__ *");
      selectors.push(".__web-inspector-hidebefore-shortcut__::before");
      selectors.push(".__web-inspector-hideafter-shortcut__::after");
      const selector = selectors.join(", ");
      const ruleBody = "    visibility: hidden !important;";
      const rule = "\n" + selector + "\n{\n" + ruleBody + "\n}\n";
      const className = classNamePrefix + (pseudoType2 || "") + classNameSuffix;
      this.classList.toggle(className, hidden2);
      let localRoot = this;
      while (localRoot.parentNode) {
        localRoot = localRoot.parentNode;
      }
      if (localRoot.nodeType === Node.DOCUMENT_NODE) {
        localRoot = document.head;
      }
      let style = localRoot.querySelector("style#" + styleTagId);
      if (style) {
        return;
      }
      style = document.createElement("style");
      style.id = styleTagId;
      style.textContent = rule;
      localRoot.appendChild(style);
    }
  }
  isToggledToHidden(node) {
    return Boolean(node.marker("hidden-marker"));
  }
  reset() {
    this.rootDOMNode = null;
    this.selectDOMNode(null, false);
    this.imagePreviewPopover.hide();
    delete this.clipboardNodeData;
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    this.updateRecords.clear();
  }
  wireToDOMModel(domModel) {
    elementsTreeOutlineByDOMModel.set(domModel, this);
    domModel.addEventListener(SDK.DOMModel.Events.MarkersChanged, this.markersChanged, this);
    domModel.addEventListener(SDK.DOMModel.Events.NodeInserted, this.nodeInserted, this);
    domModel.addEventListener(SDK.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
    domModel.addEventListener(SDK.DOMModel.Events.AttrModified, this.attributeModified, this);
    domModel.addEventListener(SDK.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
    domModel.addEventListener(SDK.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
    domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
    domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
    domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
    domModel.addEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
  }
  unwireFromDOMModel(domModel) {
    domModel.removeEventListener(SDK.DOMModel.Events.MarkersChanged, this.markersChanged, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted, this.nodeInserted, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
    domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, this.attributeModified, this);
    domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
    domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
    domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
    domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
    domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
    domModel.removeEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
    elementsTreeOutlineByDOMModel.delete(domModel);
  }
  addUpdateRecord(node) {
    let record = this.updateRecords.get(node);
    if (!record) {
      record = new UpdateRecord();
      this.updateRecords.set(node, record);
    }
    return record;
  }
  updateRecordForHighlight(node) {
    if (!this.visible) {
      return null;
    }
    return this.updateRecords.get(node) || null;
  }
  documentUpdated(event) {
    const domModel = event.data;
    this.reset();
    if (domModel.existingDocument()) {
      this.rootDOMNode = domModel.existingDocument();
    }
  }
  attributeModified(event) {
    const { node } = event.data;
    this.addUpdateRecord(node).attributeModified(event.data.name);
    this.updateModifiedNodesSoon();
  }
  attributeRemoved(event) {
    const { node } = event.data;
    this.addUpdateRecord(node).attributeRemoved(event.data.name);
    this.updateModifiedNodesSoon();
  }
  characterDataModified(event) {
    const node = event.data;
    this.addUpdateRecord(node).charDataModified();
    if (node.parentNode && node.parentNode.firstChild === node.parentNode.lastChild) {
      this.addUpdateRecord(node.parentNode).childrenModified();
    }
    this.updateModifiedNodesSoon();
  }
  nodeInserted(event) {
    const node = event.data;
    this.addUpdateRecord(node.parentNode).nodeInserted(node);
    this.updateModifiedNodesSoon();
  }
  nodeRemoved(event) {
    const { node, parent } = event.data;
    this.resetClipboardIfNeeded(node);
    this.addUpdateRecord(parent).nodeRemoved(node);
    this.updateModifiedNodesSoon();
  }
  childNodeCountUpdated(event) {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }
  distributedNodesChanged(event) {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }
  updateModifiedNodesSoon() {
    if (!this.updateRecords.size) {
      return;
    }
    if (this.updateModifiedNodesTimeout) {
      return;
    }
    this.updateModifiedNodesTimeout = window.setTimeout(this.updateModifiedNodes.bind(this), 50);
  }
  updateModifiedNodes() {
    if (this.updateModifiedNodesTimeout) {
      clearTimeout(this.updateModifiedNodesTimeout);
      delete this.updateModifiedNodesTimeout;
    }
    const updatedNodes = [...this.updateRecords.keys()];
    const hidePanelWhileUpdating = updatedNodes.length > 10;
    let treeOutlineContainerElement;
    let originalScrollTop;
    if (hidePanelWhileUpdating) {
      treeOutlineContainerElement = this.element.parentNode;
      originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
      this.elementInternal.classList.add("hidden");
    }
    const rootNodeUpdateRecords = this.rootDOMNodeInternal && this.updateRecords.get(this.rootDOMNodeInternal);
    if (rootNodeUpdateRecords && rootNodeUpdateRecords.hasChangedChildren()) {
      this.update();
    } else {
      for (const [node, record] of this.updateRecords) {
        if (record.hasChangedChildren()) {
          this.updateModifiedParentNode(node);
        } else {
          this.updateModifiedNode(node);
        }
      }
    }
    if (hidePanelWhileUpdating) {
      this.elementInternal.classList.remove("hidden");
      if (treeOutlineContainerElement && originalScrollTop) {
        treeOutlineContainerElement.scrollTop = originalScrollTop;
      }
    }
    this.updateRecords.clear();
    this.fireElementsTreeUpdated(updatedNodes);
  }
  updateModifiedNode(node) {
    const treeElement = this.findTreeElement(node);
    if (treeElement) {
      treeElement.updateTitle(this.updateRecordForHighlight(node));
    }
  }
  updateModifiedParentNode(node) {
    const parentTreeElement = this.findTreeElement(node);
    if (parentTreeElement) {
      parentTreeElement.setExpandable(this.hasVisibleChildren(node));
      parentTreeElement.updateTitle(this.updateRecordForHighlight(node));
      if (populatedTreeElements.has(parentTreeElement)) {
        this.updateChildren(parentTreeElement);
      }
    }
  }
  populateTreeElement(treeElement) {
    if (treeElement.childCount() || !treeElement.isExpandable()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      treeElement.node().getChildNodes(() => {
        populatedTreeElements.add(treeElement);
        this.updateModifiedParentNode(treeElement.node());
        resolve();
      });
    });
  }
  async createTopLayerContainer(parent, domModel) {
    if (!parent.treeOutline || !(parent.treeOutline instanceof ElementsTreeOutline)) {
      return;
    }
    const container = new TopLayerContainer(parent.treeOutline, domModel);
    await container.throttledUpdateTopLayerElements();
    if (container.currentTopLayerDOMNodes.size > 0) {
      parent.appendChild(container);
    }
    this.#topLayerContainerByParent.set(parent, container);
  }
  createElementTreeElement(node, isClosingTag) {
    const treeElement = new ElementsTreeElement(node, isClosingTag);
    treeElement.setExpandable(!isClosingTag && this.hasVisibleChildren(node));
    if (node.nodeType() === Node.ELEMENT_NODE && node.parentNode && node.parentNode.nodeType() === Node.DOCUMENT_NODE && !node.parentNode.parentNode) {
      treeElement.setCollapsible(false);
    }
    if (node.hasAssignedSlot()) {
      treeElement.createSlotLink(node.assignedSlot);
    }
    treeElement.selectable = Boolean(this.selectEnabled);
    return treeElement;
  }
  showChild(treeElement, child) {
    if (treeElement.isClosingTag()) {
      return null;
    }
    const index = this.visibleChildren(treeElement.node()).indexOf(child);
    if (index === -1) {
      return null;
    }
    if (index >= treeElement.expandedChildrenLimit()) {
      this.setExpandedChildrenLimit(treeElement, index + 1);
    }
    return treeElement.childAt(index);
  }
  visibleChildren(node) {
    let visibleChildren = ElementsTreeElement.visibleShadowRoots(node);
    const contentDocument = node.contentDocument();
    if (contentDocument) {
      visibleChildren.push(contentDocument);
    }
    const templateContent = node.templateContent();
    if (templateContent) {
      visibleChildren.push(templateContent);
    }
    visibleChildren.push(...node.viewTransitionPseudoElements());
    const markerPseudoElement = node.markerPseudoElement();
    if (markerPseudoElement) {
      visibleChildren.push(markerPseudoElement);
    }
    const beforePseudoElement = node.beforePseudoElement();
    if (beforePseudoElement) {
      visibleChildren.push(beforePseudoElement);
    }
    if (node.childNodeCount()) {
      let children = node.children() || [];
      if (!this.showHTMLCommentsSetting.get()) {
        children = children.filter((n) => n.nodeType() !== Node.COMMENT_NODE);
      }
      visibleChildren = visibleChildren.concat(children);
    }
    const afterPseudoElement = node.afterPseudoElement();
    if (afterPseudoElement) {
      visibleChildren.push(afterPseudoElement);
    }
    const backdropPseudoElement = node.backdropPseudoElement();
    if (backdropPseudoElement) {
      visibleChildren.push(backdropPseudoElement);
    }
    return visibleChildren;
  }
  hasVisibleChildren(node) {
    if (node.isIframe()) {
      return true;
    }
    if (node.isPortal()) {
      return true;
    }
    if (node.contentDocument()) {
      return true;
    }
    if (node.templateContent()) {
      return true;
    }
    if (ElementsTreeElement.visibleShadowRoots(node).length) {
      return true;
    }
    if (node.hasPseudoElements()) {
      return true;
    }
    if (node.isInsertionPoint()) {
      return true;
    }
    return Boolean(node.childNodeCount()) && !ElementsTreeElement.canShowInlineText(node);
  }
  createExpandAllButtonTreeElement(treeElement) {
    const button = UI.UIUtils.createTextButton("", handleLoadAllChildren.bind(this));
    button.value = "";
    const expandAllButtonElement = new UI.TreeOutline.TreeElement(button);
    expandAllButtonElement.selectable = false;
    expandAllButtonElement.button = button;
    return expandAllButtonElement;
    function handleLoadAllChildren(event) {
      const visibleChildCount = this.visibleChildren(treeElement.node()).length;
      this.setExpandedChildrenLimit(treeElement, Math.max(visibleChildCount, treeElement.expandedChildrenLimit() + InitialChildrenLimit));
      event.consume();
    }
  }
  setExpandedChildrenLimit(treeElement, expandedChildrenLimit) {
    if (treeElement.expandedChildrenLimit() === expandedChildrenLimit) {
      return;
    }
    treeElement.setExpandedChildrenLimit(expandedChildrenLimit);
    if (treeElement.treeOutline && !this.treeElementsBeingUpdated.has(treeElement)) {
      this.updateModifiedParentNode(treeElement.node());
    }
  }
  updateChildren(treeElement) {
    if (!treeElement.isExpandable()) {
      if (!treeElement.treeOutline) {
        return;
      }
      const selectedTreeElement = treeElement.treeOutline.selectedTreeElement;
      if (selectedTreeElement && selectedTreeElement.hasAncestor(treeElement)) {
        treeElement.select(true);
      }
      treeElement.removeChildren();
      return;
    }
    console.assert(!treeElement.isClosingTag());
    this.innerUpdateChildren(treeElement);
  }
  insertChildElement(treeElement, child, index, isClosingTag) {
    const newElement = this.createElementTreeElement(child, isClosingTag);
    treeElement.insertChild(newElement, index);
    if (child.nodeType() === Node.DOCUMENT_NODE) {
      void this.createTopLayerContainer(newElement, child.domModel());
    }
    return newElement;
  }
  moveChild(treeElement, child, targetIndex) {
    if (treeElement.indexOfChild(child) === targetIndex) {
      return;
    }
    const wasSelected = child.selected;
    if (child.parent) {
      child.parent.removeChild(child);
    }
    treeElement.insertChild(child, targetIndex);
    if (wasSelected) {
      child.select();
    }
  }
  innerUpdateChildren(treeElement) {
    if (this.treeElementsBeingUpdated.has(treeElement)) {
      return;
    }
    this.treeElementsBeingUpdated.add(treeElement);
    const node = treeElement.node();
    const visibleChildren = this.visibleChildren(node);
    const visibleChildrenSet = new Set(visibleChildren);
    const existingTreeElements = /* @__PURE__ */ new Map();
    for (let i = treeElement.childCount() - 1; i >= 0; --i) {
      const existingTreeElement = treeElement.childAt(i);
      if (!(existingTreeElement instanceof ElementsTreeElement)) {
        treeElement.removeChildAtIndex(i);
        continue;
      }
      const elementsTreeElement = existingTreeElement;
      const existingNode = elementsTreeElement.node();
      if (visibleChildrenSet.has(existingNode)) {
        existingTreeElements.set(existingNode, existingTreeElement);
        continue;
      }
      treeElement.removeChildAtIndex(i);
    }
    for (let i = 0; i < visibleChildren.length && i < treeElement.expandedChildrenLimit(); ++i) {
      const child = visibleChildren[i];
      const existingTreeElement = existingTreeElements.get(child) || this.findTreeElement(child);
      if (existingTreeElement && existingTreeElement !== treeElement) {
        this.moveChild(treeElement, existingTreeElement, i);
      } else {
        const newElement = this.insertChildElement(treeElement, child, i);
        if (this.updateRecordForHighlight(node) && treeElement.expanded) {
          ElementsTreeElement.animateOnDOMUpdate(newElement);
        }
        if (treeElement.childCount() > treeElement.expandedChildrenLimit()) {
          this.setExpandedChildrenLimit(treeElement, treeElement.expandedChildrenLimit() + 1);
        }
      }
    }
    const expandedChildCount = treeElement.childCount();
    if (visibleChildren.length > expandedChildCount) {
      const targetButtonIndex = expandedChildCount;
      if (!treeElement.expandAllButtonElement) {
        treeElement.expandAllButtonElement = this.createExpandAllButtonTreeElement(treeElement);
      }
      treeElement.insertChild(treeElement.expandAllButtonElement, targetButtonIndex);
      treeElement.expandAllButtonElement.title = i18nString(UIStrings.showAllNodesDMore, { PH1: visibleChildren.length - expandedChildCount });
    } else if (treeElement.expandAllButtonElement) {
      treeElement.expandAllButtonElement = null;
    }
    if (node.isInsertionPoint()) {
      for (const distributedNode of node.distributedNodes()) {
        treeElement.appendChild(new ShortcutTreeElement(distributedNode));
      }
    }
    if (node.nodeType() === Node.ELEMENT_NODE && !node.pseudoType() && treeElement.isExpandable()) {
      this.insertChildElement(treeElement, node, treeElement.childCount(), true);
    }
    this.treeElementsBeingUpdated.delete(treeElement);
  }
  markersChanged(event) {
    const node = event.data;
    const treeElement = this.treeElementByNode.get(node);
    if (treeElement) {
      treeElement.updateDecorations();
    }
  }
  async topLayerElementsChanged() {
    for (const [parent, container] of this.#topLayerContainerByParent) {
      await container.throttledUpdateTopLayerElements();
      if (container.currentTopLayerDOMNodes.size > 0 && container.parent !== parent) {
        parent.appendChild(container);
      }
      container.hidden = container.currentTopLayerDOMNodes.size === 0;
    }
  }
  static treeOutlineSymbol = Symbol("treeOutline");
}
((ElementsTreeOutline2) => {
  let Events;
  ((Events2) => {
    Events2["SelectedNodeChanged"] = "SelectedNodeChanged";
    Events2["ElementsTreeUpdated"] = "ElementsTreeUpdated";
  })(Events = ElementsTreeOutline2.Events || (ElementsTreeOutline2.Events = {}));
})(ElementsTreeOutline || (ElementsTreeOutline = {}));
export const MappedCharToEntity = /* @__PURE__ */ new Map([
  ["\xA0", "nbsp"],
  ["\xAD", "shy"],
  ["\u2002", "ensp"],
  ["\u2003", "emsp"],
  ["\u2009", "thinsp"],
  ["\u200A", "hairsp"],
  ["\u200B", "ZeroWidthSpace"],
  ["\u200C", "zwnj"],
  ["\u200D", "zwj"],
  ["\u200E", "lrm"],
  ["\u200F", "rlm"],
  ["\u202A", "#x202A"],
  ["\u202B", "#x202B"],
  ["\u202C", "#x202C"],
  ["\u202D", "#x202D"],
  ["\u202E", "#x202E"],
  ["\u2060", "NoBreak"],
  ["\uFEFF", "#xFEFF"]
]);
export class UpdateRecord {
  modifiedAttributes;
  removedAttributes;
  hasChangedChildrenInternal;
  hasRemovedChildrenInternal;
  charDataModifiedInternal;
  attributeModified(attrName) {
    if (this.removedAttributes && this.removedAttributes.has(attrName)) {
      this.removedAttributes.delete(attrName);
    }
    if (!this.modifiedAttributes) {
      this.modifiedAttributes = /* @__PURE__ */ new Set();
    }
    this.modifiedAttributes.add(attrName);
  }
  attributeRemoved(attrName) {
    if (this.modifiedAttributes && this.modifiedAttributes.has(attrName)) {
      this.modifiedAttributes.delete(attrName);
    }
    if (!this.removedAttributes) {
      this.removedAttributes = /* @__PURE__ */ new Set();
    }
    this.removedAttributes.add(attrName);
  }
  nodeInserted(_node) {
    this.hasChangedChildrenInternal = true;
  }
  nodeRemoved(_node) {
    this.hasChangedChildrenInternal = true;
    this.hasRemovedChildrenInternal = true;
  }
  charDataModified() {
    this.charDataModifiedInternal = true;
  }
  childrenModified() {
    this.hasChangedChildrenInternal = true;
  }
  isAttributeModified(attributeName) {
    return this.modifiedAttributes !== null && this.modifiedAttributes !== void 0 && this.modifiedAttributes.has(attributeName);
  }
  hasRemovedAttributes() {
    return this.removedAttributes !== null && this.removedAttributes !== void 0 && Boolean(this.removedAttributes.size);
  }
  isCharDataModified() {
    return Boolean(this.charDataModifiedInternal);
  }
  hasChangedChildren() {
    return Boolean(this.hasChangedChildrenInternal);
  }
  hasRemovedChildren() {
    return Boolean(this.hasRemovedChildrenInternal);
  }
}
let rendererInstance;
export class Renderer {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!rendererInstance || forceNew) {
      rendererInstance = new Renderer();
    }
    return rendererInstance;
  }
  async render(object) {
    let node = null;
    if (object instanceof SDK.DOMModel.DOMNode) {
      node = object;
    } else if (object instanceof SDK.DOMModel.DeferredDOMNode) {
      node = await object.resolvePromise();
    }
    if (!node) {
      return null;
    }
    const treeOutline = new ElementsTreeOutline(false, true, true);
    treeOutline.rootDOMNode = node;
    const firstChild = treeOutline.firstChild();
    if (firstChild && !firstChild.isExpandable()) {
      treeOutline.element.classList.add("single-node");
    }
    treeOutline.setVisible(true);
    treeOutline.element.treeElementForTest = firstChild;
    treeOutline.setShowSelectionOnKeyboardFocus(true, true);
    return { node: treeOutline.element, tree: treeOutline };
  }
}
export class ShortcutTreeElement extends UI.TreeOutline.TreeElement {
  nodeShortcut;
  hoveredInternal;
  constructor(nodeShortcut) {
    super("");
    this.listItemElement.createChild("div", "selection fill");
    const title = this.listItemElement.createChild("span", "elements-tree-shortcut-title");
    let text = nodeShortcut.nodeName.toLowerCase();
    if (nodeShortcut.nodeType === Node.ELEMENT_NODE) {
      text = "<" + text + ">";
    }
    title.textContent = "\u21AA " + text;
    this.nodeShortcut = nodeShortcut;
    this.addRevealAdorner();
  }
  addRevealAdorner() {
    const adorner = new Adorners.Adorner.Adorner();
    adorner.classList.add("adorner-reveal");
    const config = ElementsComponents.AdornerManager.getRegisteredAdorner(ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL);
    const name = config.name;
    const adornerContent = document.createElement("span");
    const linkIcon = new IconButton.Icon.Icon();
    linkIcon.data = { iconName: "ic_show_node_16x16", color: "var(--color-text-disabled)", width: "12px", height: "12px" };
    const slotText = document.createElement("span");
    slotText.textContent = name;
    adornerContent.append(linkIcon);
    adornerContent.append(slotText);
    adornerContent.classList.add("adorner-with-icon");
    adorner.data = {
      name,
      content: adornerContent
    };
    this.listItemElement.appendChild(adorner);
    const onClick = () => {
      this.nodeShortcut.deferredNode.resolve((node) => {
        void Common.Revealer.reveal(node);
      });
    };
    adorner.addInteraction(onClick, {
      isToggle: false,
      shouldPropagateOnKeydown: false,
      ariaLabelDefault: i18nString(UIStrings.reveal),
      ariaLabelActive: i18nString(UIStrings.reveal)
    });
    adorner.addEventListener("mousedown", (e) => e.consume(), false);
    ElementsPanel.instance().registerAdorner(adorner);
  }
  get hovered() {
    return Boolean(this.hoveredInternal);
  }
  set hovered(x) {
    if (this.hoveredInternal === x) {
      return;
    }
    this.hoveredInternal = x;
    this.listItemElement.classList.toggle("hovered", x);
  }
  deferredNode() {
    return this.nodeShortcut.deferredNode;
  }
  domModel() {
    return this.nodeShortcut.deferredNode.domModel();
  }
  onselect(selectedByUser) {
    if (!selectedByUser) {
      return true;
    }
    this.nodeShortcut.deferredNode.highlight();
    this.nodeShortcut.deferredNode.resolve(resolved.bind(this));
    function resolved(node) {
      if (node && this.treeOutline instanceof ElementsTreeOutline) {
        this.treeOutline.selectedDOMNodeInternal = node;
        this.treeOutline.selectedNodeChanged(false);
      }
    }
    return true;
  }
}
//# sourceMappingURL=ElementsTreeOutline.js.map
