import * as FrontendHelpers from "../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js";
import * as Elements from "../../../../panels/elements/components/components.js";
await FrontendHelpers.initializeGlobalVars();
const component = new Elements.ComputedStyleProperty.ComputedStyleProperty();
document.getElementById("container")?.appendChild(component);
component.data = {
  propertyNameRenderer: () => {
    const propertyName = document.createElement("span");
    propertyName.textContent = "display";
    propertyName.slot = "property-name";
    return propertyName;
  },
  propertyValueRenderer: () => {
    const propertyValue = document.createElement("span");
    propertyValue.textContent = "block";
    propertyValue.slot = "property-value";
    return propertyValue;
  },
  inherited: true,
  traceable: false,
  onNavigateToSource: () => {
  }
};
//# sourceMappingURL=basic.js.map
