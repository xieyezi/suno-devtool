import * as Host from "../../../core/host/host.js";
import * as i18n from "../../../core/i18n/i18n.js";
import * as Platform from "../../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "../../../core/platform/platform.js";
import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as IconButton from "../../../ui/components/icon_button/icon_button.js";
import * as Coordinator from "../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI from "../../../ui/legacy/legacy.js";
import * as LitHtml from "../../../ui/lit-html/lit-html.js";
import breakpointsViewStyles from "./breakpointsView.css.js";
import { findNextNodeForKeyboardNavigation } from "./BreakpointsViewUtils.js";
const UIStrings = {
  pauseOnUncaughtExceptions: "Pause on uncaught exceptions",
  pauseOnCaughtExceptions: "Pause on caught exceptions",
  checked: "checked",
  unchecked: "unchecked",
  indeterminate: "mixed",
  breakpointHit: "{PH1} breakpoint hit",
  removeAllBreakpointsInFile: "Remove all breakpoints in file",
  disableAllBreakpointsInFile: "Disable all breakpoints in file",
  enableAllBreakpointsInFile: "Enable all breakpoints in file",
  editCondition: "Edit condition",
  editLogpoint: "Edit logpoint",
  removeBreakpoint: "Remove breakpoint",
  removeAllBreakpoints: "Remove all breakpoints",
  removeOtherBreakpoints: "Remove other breakpoints",
  revealLocation: "Reveal location",
  conditionCode: "Condition: {PH1}",
  logpointCode: "Logpoint: {PH1}"
};
const str_ = i18n.i18n.registerUIStrings("panels/sources/components/BreakpointsView.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const MAX_SNIPPET_LENGTH = 200;
export var BreakpointStatus = /* @__PURE__ */ ((BreakpointStatus2) => {
  BreakpointStatus2["ENABLED"] = "ENABLED";
  BreakpointStatus2["DISABLED"] = "DISABLED";
  BreakpointStatus2["INDETERMINATE"] = "INDETERMINATE";
  return BreakpointStatus2;
})(BreakpointStatus || {});
export var BreakpointType = /* @__PURE__ */ ((BreakpointType2) => {
  BreakpointType2["LOGPOINT"] = "LOGPOINT";
  BreakpointType2["CONDITIONAL_BREAKPOINT"] = "CONDITIONAL_BREAKPOINT";
  BreakpointType2["REGULAR_BREAKPOINT"] = "REGULAR_BREAKPOINT";
  return BreakpointType2;
})(BreakpointType || {});
export class CheckboxToggledEvent extends Event {
  static eventName = "checkboxtoggled";
  data;
  constructor(breakpointItem, checked) {
    super(CheckboxToggledEvent.eventName);
    this.data = { breakpointItem, checked };
  }
}
export class PauseOnUncaughtExceptionsStateChangedEvent extends Event {
  static eventName = "pauseonuncaughtexceptionsstatechanged";
  data;
  constructor(checked) {
    super(PauseOnUncaughtExceptionsStateChangedEvent.eventName);
    this.data = { checked };
  }
}
export class PauseOnCaughtExceptionsStateChangedEvent extends Event {
  static eventName = "pauseoncaughtexceptionsstatechanged";
  data;
  constructor(checked) {
    super(PauseOnCaughtExceptionsStateChangedEvent.eventName);
    this.data = { checked };
  }
}
export class ExpandedStateChangedEvent extends Event {
  static eventName = "expandedstatechanged";
  data;
  constructor(url, expanded) {
    super(ExpandedStateChangedEvent.eventName);
    this.data = { url, expanded };
  }
}
export class BreakpointSelectedEvent extends Event {
  static eventName = "breakpointselected";
  data;
  constructor(breakpointItem) {
    super(BreakpointSelectedEvent.eventName);
    this.data = { breakpointItem };
  }
}
export class BreakpointEditedEvent extends Event {
  static eventName = "breakpointedited";
  data;
  constructor(breakpointItem) {
    super(BreakpointEditedEvent.eventName);
    this.data = { breakpointItem };
  }
}
export class BreakpointsRemovedEvent extends Event {
  static eventName = "breakpointsremoved";
  data;
  constructor(breakpointItems) {
    super(BreakpointsRemovedEvent.eventName);
    this.data = { breakpointItems };
  }
}
export class BreakpointsView extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-breakpoint-view`;
  #shadow = this.attachShadow({ mode: "open" });
  #pauseOnUncaughtExceptions = false;
  #pauseOnCaughtExceptions = false;
  #independentPauseToggles = false;
  #breakpointsActive = true;
  #breakpointGroups = [];
  #scheduledRender = false;
  #enqueuedRender = false;
  set data(data) {
    this.#pauseOnUncaughtExceptions = data.pauseOnUncaughtExceptions;
    this.#pauseOnCaughtExceptions = data.pauseOnCaughtExceptions;
    this.#independentPauseToggles = data.independentPauseToggles;
    this.#breakpointsActive = data.breakpointsActive;
    this.#breakpointGroups = data.groups;
    void this.#render();
  }
  connectedCallback() {
    this.#shadow.adoptedStyleSheets = [breakpointsViewStyles];
  }
  async #render() {
    if (this.#scheduledRender) {
      this.#enqueuedRender = true;
      return;
    }
    this.#scheduledRender = true;
    await coordinator.write("BreakpointsView render", () => {
      const clickHandler = async (event) => {
        const currentTarget = event.currentTarget;
        await this.#setSelected(currentTarget);
        event.consume();
      };
      const pauseOnCaughtIsChecked = (this.#independentPauseToggles || this.#pauseOnUncaughtExceptions) && this.#pauseOnCaughtExceptions;
      const pauseOnCaughtExceptionIsDisabled = !this.#independentPauseToggles && !this.#pauseOnUncaughtExceptions;
      const out = LitHtml.html`
        <div class='pause-on-uncaught-exceptions'
            tabindex='0'
            @click=${clickHandler}
            @keydown=${this.#keyDownHandler}
            data-first-pause>
          <label class='checkbox-label'>
            <input type='checkbox' tabindex=-1 ?checked=${this.#pauseOnUncaughtExceptions} @change=${this.#onPauseOnUncaughtExceptionsStateChanged.bind(this)}>
            <span>${i18nString(UIStrings.pauseOnUncaughtExceptions)}</span>
          </label>
        </div>
        <div class='pause-on-caught-exceptions'
              tabindex='-1'
              @click=${clickHandler}
              @keydown=${this.#keyDownHandler}
              data-last-pause>
            <label class='checkbox-label'>
              <input data-pause-on-caught-checkbox type='checkbox' tabindex=-1 ?checked=${pauseOnCaughtIsChecked} ?disabled=${pauseOnCaughtExceptionIsDisabled} @change=${this.#onPauseOnCaughtExceptionsStateChanged.bind(this)}>
              <span>${i18nString(UIStrings.pauseOnCaughtExceptions)}</span>
            </label>
        </div>
        <div role=tree>
          ${LitHtml.Directives.repeat(this.#breakpointGroups, (group) => group.url, (group, groupIndex) => LitHtml.html`${this.#renderBreakpointGroup(group, groupIndex)}`)}
        </div>`;
      LitHtml.render(out, this.#shadow, { host: this });
    });
    await coordinator.write("make pause-on-exceptions focusable", () => {
      if (this.#shadow.querySelector('[tabindex="0"]') === null) {
        const element = this.#shadow.querySelector("[data-first-pause]");
        element?.setAttribute("tabindex", "0");
      }
    });
    this.#scheduledRender = false;
    if (this.#enqueuedRender) {
      this.#enqueuedRender = false;
      return this.#render();
    }
  }
  async #keyDownHandler(event) {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.consume(true);
      return this.#handleHomeOrEndKey(event.key);
    }
    if (Platform.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.consume(true);
      return this.#handleArrowKey(event.key, event.target);
    }
    return;
  }
  async #setSelected(element) {
    if (!element) {
      return;
    }
    void coordinator.write("focus on selected element", () => {
      const prevSelected = this.#shadow.querySelector('[tabindex="0"]');
      prevSelected?.setAttribute("tabindex", "-1");
      element.setAttribute("tabindex", "0");
      element.focus();
    });
  }
  async #handleArrowKey(key, target) {
    const setGroupExpandedState = (detailsElement, expanded) => {
      if (expanded) {
        return coordinator.write("expand", () => {
          detailsElement.setAttribute("open", "");
        });
      }
      return coordinator.write("expand", () => {
        detailsElement.removeAttribute("open");
      });
    };
    const nextNode = await findNextNodeForKeyboardNavigation(target, key, setGroupExpandedState);
    return this.#setSelected(nextNode);
  }
  async #handleHomeOrEndKey(key) {
    if (key === "Home") {
      const pauseOnExceptionsNode = this.#shadow.querySelector("[data-first-pause]");
      return this.#setSelected(pauseOnExceptionsNode);
    }
    if (key === "End") {
      const numGroups = this.#breakpointGroups.length;
      if (numGroups === 0) {
        const lastPauseOnExceptionsNode = this.#shadow.querySelector("[data-last-pause]");
        return this.#setSelected(lastPauseOnExceptionsNode);
      }
      const lastGroupIndex = numGroups - 1;
      const lastGroup = this.#breakpointGroups[lastGroupIndex];
      if (lastGroup.expanded) {
        const lastBreakpointItem = this.#shadow.querySelector("[data-last-group] > [data-last-breakpoint]");
        return this.#setSelected(lastBreakpointItem);
      }
      const lastGroupSummaryElement = this.#shadow.querySelector("[data-last-group] > summary");
      return this.#setSelected(lastGroupSummaryElement);
    }
    return;
  }
  #renderEditBreakpointButton(breakpointItem) {
    const clickHandler = (event) => {
      Host.userMetrics.breakpointEditDialogRevealedFrom(Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointSidebarEditButton);
      this.dispatchEvent(new BreakpointEditedEvent(breakpointItem));
      event.consume();
    };
    const title = breakpointItem.type === "LOGPOINT" /* LOGPOINT */ ? i18nString(UIStrings.editLogpoint) : i18nString(UIStrings.editCondition);
    return LitHtml.html`
    <button data-edit-breakpoint @click=${clickHandler} title=${title}>
    <${IconButton.Icon.Icon.litTagName} .data=${{
      iconName: "edit-icon",
      width: "14px",
      color: "var(--color-text-secondary)"
    }}
      }>
      </${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
  }
  #renderRemoveBreakpointButton(breakpointItems, tooltipText) {
    const clickHandler = (event) => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointRemovedFromRemoveButton);
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
      event.consume();
    };
    return LitHtml.html`
    <button data-remove-breakpoint @click=${clickHandler} title=${tooltipText}>
    <${IconButton.Icon.Icon.litTagName} .data=${{
      iconName: "close-icon",
      width: "10px",
      color: "var(--color-text-secondary)"
    }}
      }>
      </${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
  }
  #onBreakpointGroupContextMenu(event, breakpointGroup) {
    const { breakpointItems } = breakpointGroup;
    const menu = new UI.ContextMenu.ContextMenu(event);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpointsInFile), () => {
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
    });
    const notDisabledItems = breakpointItems.filter((breakpointItem) => breakpointItem.status !== "DISABLED" /* DISABLED */);
    menu.defaultSection().appendItem(i18nString(UIStrings.disableAllBreakpointsInFile), () => {
      for (const breakpointItem of notDisabledItems) {
        this.dispatchEvent(new CheckboxToggledEvent(breakpointItem, false));
      }
    }, notDisabledItems.length === 0);
    const notEnabledItems = breakpointItems.filter((breakpointItem) => breakpointItem.status !== "ENABLED" /* ENABLED */);
    menu.defaultSection().appendItem(i18nString(UIStrings.enableAllBreakpointsInFile), () => {
      for (const breakpointItem of notEnabledItems) {
        this.dispatchEvent(new CheckboxToggledEvent(breakpointItem, true));
      }
    }, notEnabledItems.length === 0);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpoints), () => {
      const breakpointItems2 = this.#breakpointGroups.map(({ breakpointItems: breakpointItems3 }) => breakpointItems3).flat();
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems2));
    });
    const otherGroups = this.#breakpointGroups.filter((group) => group !== breakpointGroup);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeOtherBreakpoints), () => {
      const breakpointItems2 = otherGroups.map(({ breakpointItems: breakpointItems3 }) => breakpointItems3).flat();
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems2));
    }, otherGroups.length === 0);
    void menu.show();
  }
  #renderBreakpointGroup(group, groupIndex) {
    const contextmenuHandler = (event) => {
      this.#onBreakpointGroupContextMenu(event, group);
      event.consume();
    };
    const toggleHandler = (event) => {
      const htmlDetails = event.target;
      group.expanded = htmlDetails.open;
      this.dispatchEvent(new ExpandedStateChangedEvent(group.url, group.expanded));
    };
    const clickHandler = async (event) => {
      const selected = event.currentTarget;
      await this.#setSelected(selected);
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.BreakpointGroupExpandedStateChanged);
      event.consume();
    };
    const classMap = {
      active: this.#breakpointsActive
    };
    return LitHtml.html`
      <details class=${LitHtml.Directives.classMap(classMap)}
               ?data-first-group=${groupIndex === 0}
               ?data-last-group=${groupIndex === this.#breakpointGroups.length - 1}
               role=group
               aria-label='${group.name}'
               aria-description='${group.url}'
               ?open=${LitHtml.Directives.live(group.expanded)}
               @toggle=${toggleHandler}>
          <summary @contextmenu=${contextmenuHandler}
                   tabindex='-1'
                   @keydown=${this.#keyDownHandler}
                   @click=${clickHandler}>
          <span class='group-header' aria-hidden=true>${this.#renderFileIcon()}<span class='group-header-title' title='${group.url}'>${group.name}</span></span>
          <span class='group-hover-actions'>
            ${this.#renderRemoveBreakpointButton(group.breakpointItems, i18nString(UIStrings.removeAllBreakpointsInFile))}
          </span>
        </summary>
        ${LitHtml.Directives.repeat(group.breakpointItems, (item) => item.id, (item, breakpointItemIndex) => this.#renderBreakpointEntry(item, group.editable, groupIndex, breakpointItemIndex))}
      </div>
      `;
  }
  #renderFileIcon() {
    return LitHtml.html`
      <${IconButton.Icon.Icon.litTagName} .data=${{ iconName: "ic_file_script", color: "var(--color-ic-file-script)", width: "16px", height: "16px" }}></${IconButton.Icon.Icon.litTagName}>
    `;
  }
  #onBreakpointEntryContextMenu(event, breakpointItem, editable) {
    const menu = new UI.ContextMenu.ContextMenu(event);
    const editBreakpointText = breakpointItem.type === "LOGPOINT" /* LOGPOINT */ ? i18nString(UIStrings.editLogpoint) : i18nString(UIStrings.editCondition);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeBreakpoint), () => {
      this.dispatchEvent(new BreakpointsRemovedEvent([breakpointItem]));
    });
    menu.defaultSection().appendItem(editBreakpointText, () => {
      Host.userMetrics.breakpointEditDialogRevealedFrom(Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointSidebarContextMenu);
      this.dispatchEvent(new BreakpointEditedEvent(breakpointItem));
    }, !editable);
    menu.defaultSection().appendItem(i18nString(UIStrings.revealLocation), () => {
      this.dispatchEvent(new BreakpointSelectedEvent(breakpointItem));
    });
    menu.defaultSection().appendItem(i18nString(UIStrings.removeAllBreakpoints), () => {
      const breakpointItems = this.#breakpointGroups.map(({ breakpointItems: breakpointItems2 }) => breakpointItems2).flat();
      this.dispatchEvent(new BreakpointsRemovedEvent(breakpointItems));
    });
    const otherItems = this.#breakpointGroups.map(({ breakpointItems }) => breakpointItems).flat().filter((item) => item !== breakpointItem);
    menu.defaultSection().appendItem(i18nString(UIStrings.removeOtherBreakpoints), () => {
      this.dispatchEvent(new BreakpointsRemovedEvent(otherItems));
    }, otherItems.length === 0);
    void menu.show();
  }
  #renderBreakpointEntry(breakpointItem, editable, groupIndex, breakpointItemIndex) {
    const codeSnippetClickHandler = (event) => {
      this.dispatchEvent(new BreakpointSelectedEvent(breakpointItem));
      event.consume();
    };
    const breakpointItemClickHandler = async (event) => {
      const target = event.currentTarget;
      await this.#setSelected(target);
      event.consume();
    };
    const contextmenuHandler = (event) => {
      this.#onBreakpointEntryContextMenu(event, breakpointItem, editable);
      event.consume();
    };
    const classMap = {
      "breakpoint-item": true,
      "hit": breakpointItem.isHit,
      "conditional-breakpoint": breakpointItem.type === "CONDITIONAL_BREAKPOINT" /* CONDITIONAL_BREAKPOINT */,
      "logpoint": breakpointItem.type === "LOGPOINT" /* LOGPOINT */
    };
    const breakpointItemDescription = this.#getBreakpointItemDescription(breakpointItem);
    const codeSnippet = Platform.StringUtilities.trimEndWithMaxLength(breakpointItem.codeSnippet, MAX_SNIPPET_LENGTH);
    const codeSnippetTooltip = this.#getCodeSnippetTooltip(breakpointItem.type, breakpointItem.hoverText);
    const itemsInGroup = this.#breakpointGroups[groupIndex].breakpointItems;
    return LitHtml.html`
    <div class=${LitHtml.Directives.classMap(classMap)}
         ?data-first-breakpoint=${breakpointItemIndex === 0}
         ?data-last-breakpoint=${breakpointItemIndex === itemsInGroup.length - 1}
         aria-label=${breakpointItemDescription}
         role=treeitem
         tabindex='-1'
         @contextmenu=${contextmenuHandler}
         @click=${breakpointItemClickHandler}
         @keydown=${this.#keyDownHandler}>
      <label class='checkbox-label'>
        <span class='type-indicator'></span>
        <input type='checkbox'
              aria-label=${breakpointItem.location}
              ?indeterminate=${breakpointItem.status === "INDETERMINATE" /* INDETERMINATE */}
              ?checked=${breakpointItem.status === "ENABLED" /* ENABLED */}
              @change=${(e) => this.#onCheckboxToggled(e, breakpointItem)}
              tabindex=-1>
      </label>
      <span class='code-snippet' @click=${codeSnippetClickHandler} title=${codeSnippetTooltip}>${codeSnippet}</span>
      <span class='breakpoint-item-location-or-actions'>
        ${editable ? this.#renderEditBreakpointButton(breakpointItem) : LitHtml.nothing}
        ${this.#renderRemoveBreakpointButton([breakpointItem], i18nString(UIStrings.removeBreakpoint))}
        <span class='location'>${breakpointItem.location}</span>
      </span>
    </div>
    `;
  }
  #getCodeSnippetTooltip(type, hoverText) {
    switch (type) {
      case "REGULAR_BREAKPOINT" /* REGULAR_BREAKPOINT */:
        return void 0;
      case "CONDITIONAL_BREAKPOINT" /* CONDITIONAL_BREAKPOINT */:
        assertNotNullOrUndefined(hoverText);
        return i18nString(UIStrings.conditionCode, { PH1: hoverText });
      case "LOGPOINT" /* LOGPOINT */:
        assertNotNullOrUndefined(hoverText);
        return i18nString(UIStrings.logpointCode, { PH1: hoverText });
    }
  }
  #getBreakpointItemDescription(breakpointItem) {
    let checkboxDescription;
    switch (breakpointItem.status) {
      case "ENABLED" /* ENABLED */:
        checkboxDescription = i18nString(UIStrings.checked);
        break;
      case "DISABLED" /* DISABLED */:
        checkboxDescription = i18nString(UIStrings.unchecked);
        break;
      case "INDETERMINATE" /* INDETERMINATE */:
        checkboxDescription = i18nString(UIStrings.indeterminate);
        break;
    }
    if (!breakpointItem.isHit) {
      return checkboxDescription;
    }
    return i18nString(UIStrings.breakpointHit, { PH1: checkboxDescription });
  }
  #onCheckboxToggled(e, item) {
    const element = e.target;
    this.dispatchEvent(new CheckboxToggledEvent(item, element.checked));
  }
  #onPauseOnCaughtExceptionsStateChanged(e) {
    const { checked } = e.target;
    this.dispatchEvent(new PauseOnCaughtExceptionsStateChangedEvent(checked));
  }
  #onPauseOnUncaughtExceptionsStateChanged(e) {
    const { checked } = e.target;
    if (!this.#independentPauseToggles) {
      const pauseOnCaughtCheckbox = this.#shadow.querySelector("[data-pause-on-caught-checkbox]");
      assertNotNullOrUndefined(pauseOnCaughtCheckbox);
      if (!checked && pauseOnCaughtCheckbox.checked) {
        pauseOnCaughtCheckbox.click();
      }
      void coordinator.write("update pause-on-uncaught-exception", () => {
        if (checked) {
          pauseOnCaughtCheckbox.disabled = false;
        } else {
          pauseOnCaughtCheckbox.disabled = true;
        }
      });
    }
    this.dispatchEvent(new PauseOnUncaughtExceptionsStateChangedEvent(checked));
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-breakpoint-view", BreakpointsView);
//# sourceMappingURL=BreakpointsView.js.map
