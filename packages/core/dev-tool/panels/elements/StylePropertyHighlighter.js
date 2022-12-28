import { highlightElement } from "../utils/utils.js";
import { StylePropertyTreeElement } from "./StylePropertyTreeElement.js";
export class StylePropertyHighlighter {
  styleSidebarPane;
  constructor(ssp) {
    this.styleSidebarPane = ssp;
  }
  highlightProperty(cssProperty) {
    for (const section2 of this.styleSidebarPane.allSections()) {
      for (let treeElement2 = section2.propertiesTreeOutline.firstChild(); treeElement2; treeElement2 = treeElement2.nextSibling) {
        void treeElement2.onpopulate();
      }
    }
    const { treeElement, section } = this.findTreeElementAndSection((treeElement2) => treeElement2.property === cssProperty);
    if (treeElement) {
      treeElement.parent && treeElement.parent.expand();
      this.scrollAndHighlightTreeElement(treeElement);
      if (section) {
        section.element.focus();
      }
    }
  }
  findAndHighlightSectionBlock(sectionBlockName) {
    const block = this.styleSidebarPane.getSectionBlockByName(sectionBlockName);
    if (!block || block.sections.length === 0) {
      return;
    }
    const [section] = block.sections;
    section.showAllItems();
    highlightElement(block.titleElement());
  }
  findAndHighlightPropertyName(propertyName) {
    for (const section of this.styleSidebarPane.allSections()) {
      if (!section.style().hasActiveProperty(propertyName)) {
        continue;
      }
      section.showAllItems();
      const treeElement = this.findTreeElementFromSection((treeElement2) => treeElement2.property.name === propertyName && !treeElement2.overloaded(), section);
      if (treeElement) {
        this.scrollAndHighlightTreeElement(treeElement);
        if (section) {
          section.element.focus();
        }
        return;
      }
    }
  }
  findTreeElementAndSection(compareCb) {
    for (const section of this.styleSidebarPane.allSections()) {
      const treeElement = this.findTreeElementFromSection(compareCb, section);
      if (treeElement) {
        return { treeElement, section };
      }
    }
    return { treeElement: null, section: null };
  }
  findTreeElementFromSection(compareCb, section) {
    let treeElement = section.propertiesTreeOutline.firstChild();
    while (treeElement && treeElement instanceof StylePropertyTreeElement) {
      if (compareCb(treeElement)) {
        return treeElement;
      }
      treeElement = treeElement.traverseNextTreeElement(false, null, true);
    }
    return null;
  }
  scrollAndHighlightTreeElement(treeElement) {
    highlightElement(treeElement.listItemElement);
  }
}
//# sourceMappingURL=StylePropertyHighlighter.js.map
