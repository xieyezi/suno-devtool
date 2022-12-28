import * as FrontendHelpers from "../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js";
import * as ComponentHelpers from "../../helpers/helpers.js";
import * as TwoStatesCounter from "../../two_states_counter/two_states_counter.js";
await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();
function getGeneralCounterData() {
  return {
    active: 3,
    inactive: 10,
    width: "18px",
    height: "18px",
    activeTitle: "Num active",
    inactiveTitle: "Num inactive"
  };
}
function appendCounter(counter2) {
  document.querySelector("#container")?.appendChild(counter2);
}
const counterData = getGeneralCounterData();
const counter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
counter.data = counterData;
appendCounter(counter);
const activeCountData = getGeneralCounterData();
activeCountData.inactive = 0;
const activeOnlyCounter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
activeOnlyCounter.data = activeCountData;
appendCounter(activeOnlyCounter);
const inactiveCountData = getGeneralCounterData();
inactiveCountData.active = 0;
const inactiveOnlyCounter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
inactiveOnlyCounter.data = inactiveCountData;
appendCounter(inactiveOnlyCounter);
//# sourceMappingURL=basic.js.map
