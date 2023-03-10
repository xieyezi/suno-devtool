import * as Common from "../../core/common/common.js";
import { VBox } from "./Widget.js";
export class ThrottledWidget extends VBox {
  updateThrottler;
  updateWhenVisible;
  constructor(isWebComponent, timeout) {
    super(isWebComponent);
    this.updateThrottler = new Common.Throttler.Throttler(timeout === void 0 ? 100 : timeout);
    this.updateWhenVisible = false;
  }
  doUpdate() {
    return Promise.resolve();
  }
  update() {
    this.updateWhenVisible = !this.isShowing();
    if (this.updateWhenVisible) {
      return;
    }
    void this.updateThrottler.schedule(() => {
      if (this.isShowing()) {
        return this.doUpdate();
      }
      this.updateWhenVisible = true;
      return Promise.resolve();
    });
  }
  wasShown() {
    super.wasShown();
    if (this.updateWhenVisible) {
      this.update();
    }
  }
}
//# sourceMappingURL=ThrottledWidget.js.map
