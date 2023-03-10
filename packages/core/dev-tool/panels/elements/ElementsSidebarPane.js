import * as Common from "../../core/common/common.js";
import * as UI from "../../ui/legacy/legacy.js";
import { ComputedStyleModel, Events } from "./ComputedStyleModel.js";
export class ElementsSidebarPane extends UI.Widget.VBox {
  computedStyleModelInternal;
  updateThrottler;
  updateWhenVisible;
  constructor(delegatesFocus) {
    super(true, delegatesFocus);
    this.element.classList.add("flex-none");
    this.computedStyleModelInternal = new ComputedStyleModel();
    this.computedStyleModelInternal.addEventListener(Events.ComputedStyleChanged, this.onCSSModelChanged, this);
    this.updateThrottler = new Common.Throttler.Throttler(100);
    this.updateWhenVisible = false;
  }
  node() {
    return this.computedStyleModelInternal.node();
  }
  cssModel() {
    return this.computedStyleModelInternal.cssModel();
  }
  computedStyleModel() {
    return this.computedStyleModelInternal;
  }
  async doUpdate() {
    return;
  }
  update() {
    this.updateWhenVisible = !this.isShowing();
    if (this.updateWhenVisible) {
      return;
    }
    void this.updateThrottler.schedule(innerUpdate.bind(this));
    function innerUpdate() {
      return this.isShowing() ? this.doUpdate() : Promise.resolve();
    }
  }
  wasShown() {
    super.wasShown();
    if (this.updateWhenVisible) {
      this.update();
    }
  }
  onCSSModelChanged(_event) {
  }
}
//# sourceMappingURL=ElementsSidebarPane.js.map
