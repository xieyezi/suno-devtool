import * as i18n from "../../core/i18n/i18n.js";
import * as UI from "../../ui/legacy/legacy.js";
import { ApplicationPanelTreeElement } from "./ApplicationPanelTreeElement.js";
import { PreloadingView } from "./preloading/PreloadingView.js";
const UIStrings = {
  prefetchingAndPrerendering: "Prefetching & Prerendering"
};
const str_ = i18n.i18n.registerUIStrings("panels/application/ApplicationPanelPreloadingSection.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class PreloadingTreeElement extends ApplicationPanelTreeElement {
  model;
  view;
  constructor(resourcesPanel) {
    super(resourcesPanel, i18nString(UIStrings.prefetchingAndPrerendering), false);
    const icon = UI.Icon.Icon.create("mediumicon-fetch", "resource-tree-item");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "preloading://";
  }
  initialize(model) {
    this.model = model;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.model) {
      return false;
    }
    if (!this.view) {
      this.view = new PreloadingView(this.model);
    }
    this.showView(this.view);
    return false;
  }
}
//# sourceMappingURL=ApplicationPanelPreloadingSection.js.map
