import "../../core/dom_extension/dom_extension.js";
import "../../Images/Images.js";
if (window.opener) {
  const app = window.opener.Emulation.AdvancedApp.instance();
  app.deviceModeEmulationFrameLoaded(document);
}
//# sourceMappingURL=device_mode_emulation_frame.js.map
