import * as SDK from "../../core/sdk/sdk.js";
import * as Protocol from "../../generated/protocol.js";
import { CategorizedBreakpointsSidebarPane } from "./CategorizedBreakpointsSidebarPane.js";
let eventListenerBreakpointsSidebarPaneInstance;
export class EventListenerBreakpointsSidebarPane extends CategorizedBreakpointsSidebarPane {
  constructor() {
    let breakpoints = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().eventListenerBreakpoints();
    const nonDomBreakpoints = SDK.EventBreakpointsModel.EventBreakpointsManager.instance().eventListenerBreakpoints();
    breakpoints = breakpoints.concat(nonDomBreakpoints);
    const categories = breakpoints.map((breakpoint) => breakpoint.category());
    categories.sort();
    super(categories, breakpoints, "sources.eventListenerBreakpoints", Protocol.Debugger.PausedEventReason.EventListener);
  }
  static instance() {
    if (!eventListenerBreakpointsSidebarPaneInstance) {
      eventListenerBreakpointsSidebarPaneInstance = new EventListenerBreakpointsSidebarPane();
    }
    return eventListenerBreakpointsSidebarPaneInstance;
  }
  getBreakpointFromPausedDetails(details) {
    const auxData = details.auxData;
    const domBreakpoint = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(auxData);
    if (domBreakpoint) {
      return domBreakpoint;
    }
    return SDK.EventBreakpointsModel.EventBreakpointsManager.instance().resolveEventListenerBreakpoint(auxData);
  }
}
//# sourceMappingURL=EventListenerBreakpointsSidebarPane.js.map
