import * as ComponentHelpers from "../../helpers/helpers.js";
import * as Linkifier from "../../linkifier/linkifier.js";
await ComponentHelpers.ComponentServerSetup.setup();
const link = new Linkifier.Linkifier.Linkifier();
link.data = {
  url: "example.com",
  lineNumber: 11,
  columnNumber: 1
};
const container = document.getElementById("container");
container?.addEventListener("linkifieractivated", (event) => {
  const data = JSON.stringify(event.data, null, 2);
  alert(`Linkifier click: ${data}`);
});
container?.appendChild(link);
//# sourceMappingURL=simple-url.js.map
