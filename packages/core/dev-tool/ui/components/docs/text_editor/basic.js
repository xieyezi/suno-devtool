import * as FrontendHelpers from "../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js";
import * as ComponentHelpers from "../../helpers/helpers.js";
import * as TextEditor from "../../text_editor/text_editor.js";
await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();
const component = new TextEditor.TextEditor.TextEditor();
document.getElementById("container")?.appendChild(component);
//# sourceMappingURL=basic.js.map
