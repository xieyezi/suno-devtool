import * as FrontendHelpers from "../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js";
import * as ComponentHelpers from "../../helpers/helpers.js";
await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();
const RequestLinkIcon = await import("../../../../ui/components/request_link_icon/request_link_icon.js");
function appendComponent(data) {
  const component = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
  component.data = data;
  document.getElementById("container")?.appendChild(component);
}
appendComponent({});
//# sourceMappingURL=basic.js.map
