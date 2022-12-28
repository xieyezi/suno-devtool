import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as IconButton from "../../ui/components/icon_button/icon_button.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as ElementsComponents from "./components/components.js";
import * as ElementsTreeOutline from "./ElementsTreeOutline.js";
const UIStrings = {
  reveal: "reveal"
};
const str_ = i18n.i18n.registerUIStrings("panels/elements/TopLayerContainer.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class TopLayerContainer extends UI.TreeOutline.TreeElement {
  tree;
  domModel;
  currentTopLayerDOMNodes = /* @__PURE__ */ new Set();
  topLayerUpdateThrottler;
  constructor(tree, domModel) {
    super("#top-layer");
    this.tree = tree;
    this.domModel = domModel;
    this.topLayerUpdateThrottler = new Common.Throttler.Throttler(1);
  }
  async throttledUpdateTopLayerElements() {
    await this.topLayerUpdateThrottler.schedule(() => this.updateTopLayerElements());
  }
  async updateTopLayerElements() {
    this.removeChildren();
    this.removeCurrentTopLayerElementsAdorners();
    this.currentTopLayerDOMNodes = /* @__PURE__ */ new Set();
    const newTopLayerElementsIDs = await this.domModel.getTopLayerElements();
    if (!newTopLayerElementsIDs || newTopLayerElementsIDs.length === 0) {
      return;
    }
    let topLayerElementIndex = 0;
    for (let i = 0; i < newTopLayerElementsIDs.length; i++) {
      const topLayerDOMNode = this.domModel.idToDOMNode.get(newTopLayerElementsIDs[i]);
      if (topLayerDOMNode && topLayerDOMNode.nodeName() !== "::backdrop") {
        const topLayerElementShortcut = new SDK.DOMModel.DOMNodeShortcut(this.domModel.target(), topLayerDOMNode.backendNodeId(), 0, topLayerDOMNode.nodeName());
        const topLayerElementRepresentation = new ElementsTreeOutline.ShortcutTreeElement(topLayerElementShortcut);
        this.appendChild(topLayerElementRepresentation);
        this.currentTopLayerDOMNodes.add(topLayerDOMNode);
        const previousTopLayerDOMNode = i > 0 ? this.domModel.idToDOMNode.get(newTopLayerElementsIDs[i - 1]) : void 0;
        if (previousTopLayerDOMNode && previousTopLayerDOMNode.nodeName() === "::backdrop") {
          const backdropElementShortcut = new SDK.DOMModel.DOMNodeShortcut(this.domModel.target(), previousTopLayerDOMNode.backendNodeId(), 0, previousTopLayerDOMNode.nodeName());
          const backdropElementRepresentation = new ElementsTreeOutline.ShortcutTreeElement(backdropElementShortcut);
          topLayerElementRepresentation.appendChild(backdropElementRepresentation);
        }
        const topLayerTreeElement = this.tree.treeElementByNode.get(topLayerDOMNode);
        if (topLayerTreeElement) {
          this.addTopLayerAdorner(topLayerTreeElement, topLayerElementRepresentation, ++topLayerElementIndex);
        }
      }
    }
  }
  removeCurrentTopLayerElementsAdorners() {
    for (const node of this.currentTopLayerDOMNodes) {
      const topLayerTreeElement = this.tree.treeElementByNode.get(node);
      topLayerTreeElement?.removeAllAdorners();
    }
  }
  addTopLayerAdorner(element, topLayerElementRepresentation, topLayerElementIndex) {
    const config = ElementsComponents.AdornerManager.getRegisteredAdorner(ElementsComponents.AdornerManager.RegisteredAdorners.TOP_LAYER);
    const adornerContent = document.createElement("span");
    adornerContent.classList.add("adorner-with-icon");
    const linkIcon = new IconButton.Icon.Icon();
    linkIcon.data = { iconName: "ic_show_node_16x16", color: "var(--color-text-disabled)", width: "12px", height: "12px" };
    const adornerText = document.createElement("span");
    adornerText.textContent = ` top-layer (${topLayerElementIndex}) `;
    adornerContent.append(linkIcon);
    adornerContent.append(adornerText);
    const adorner = element?.adorn(config, adornerContent);
    if (adorner) {
      const onClick = () => {
        topLayerElementRepresentation.revealAndSelect();
      };
      adorner.addInteraction(onClick, {
        isToggle: false,
        shouldPropagateOnKeydown: false,
        ariaLabelDefault: i18nString(UIStrings.reveal),
        ariaLabelActive: i18nString(UIStrings.reveal)
      });
      adorner.addEventListener("mousedown", (e) => e.consume(), false);
    }
  }
}
//# sourceMappingURL=TopLayerContainer.js.map
