import { ShortcutRegistry } from "./ShortcutRegistry.js";
export class Tooltip {
  static install(element, tooltipContent) {
    element.title = tooltipContent || "";
  }
  static installWithActionBinding(element, tooltipContent, actionId) {
    let description = tooltipContent;
    const shortcuts = ShortcutRegistry.instance().shortcutsForAction(actionId);
    for (const shortcut of shortcuts) {
      description += ` - ${shortcut.title()}`;
    }
    element.title = description;
  }
}
//# sourceMappingURL=Tooltip.js.map
