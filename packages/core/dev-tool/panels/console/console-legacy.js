import * as ConsoleModule from "./console.js";
self.Console = self.Console || {};
Console = Console || {};
Console.ConsoleFilter = ConsoleModule.ConsoleFilter.ConsoleFilter;
Console.ConsolePanel = ConsoleModule.ConsolePanel.ConsolePanel;
Console.ConsolePanel.WrapperView = ConsoleModule.ConsolePanel.WrapperView;
Console.ConsolePanel.ConsoleRevealer = ConsoleModule.ConsolePanel.ConsoleRevealer;
Console.ConsolePin = ConsoleModule.ConsolePinPane.ConsolePin;
Console.ConsolePrompt = ConsoleModule.ConsolePrompt.ConsolePrompt;
Console.ConsoleSidebar = ConsoleModule.ConsoleSidebar.ConsoleSidebar;
Console.ConsoleView = ConsoleModule.ConsoleView.ConsoleView;
Console.ConsoleViewFilter = ConsoleModule.ConsoleView.ConsoleViewFilter;
Console.ConsoleView.ActionDelegate = ConsoleModule.ConsoleView.ActionDelegate;
Console.ConsoleGroup = ConsoleModule.ConsoleView.ConsoleGroup;
Console.ConsoleViewMessage = ConsoleModule.ConsoleViewMessage.ConsoleViewMessage;
Console.ConsoleViewMessage.setMaxTokenizableStringLength = ConsoleModule.ConsoleViewMessage.setMaxTokenizableStringLength;
Console.ConsoleViewMessage.setLongStringVisibleLength = ConsoleModule.ConsoleViewMessage.setLongStringVisibleLength;
Console.ConsoleGroupViewMessage = ConsoleModule.ConsoleViewMessage.ConsoleGroupViewMessage;
Console.ConsoleViewport = ConsoleModule.ConsoleViewport.ConsoleViewport;
Console.ConsoleViewportElement = ConsoleModule.ConsoleViewport.ConsoleViewportElement;
//# sourceMappingURL=console-legacy.js.map
