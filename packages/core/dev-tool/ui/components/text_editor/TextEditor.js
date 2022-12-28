import * as Common from "../../../core/common/common.js";
import * as WindowBoundsService from "../../../services/window_bounds/window_bounds.js";
import * as CodeMirror from "../../../third_party/codemirror.next/codemirror.next.js";
import * as ThemeSupport from "../../legacy/theme_support/theme_support.js";
import * as LitHtml from "../../lit-html/lit-html.js";
import * as CodeHighlighter from "../code_highlighter/code_highlighter.js";
import * as ComponentHelpers from "../helpers/helpers.js";
import { baseConfiguration, dummyDarkTheme, dynamicSetting, DynamicSetting, themeSelection } from "./config.js";
import { toLineColumn, toOffset } from "./position.js";
export class TextEditor extends HTMLElement {
  static litTagName = LitHtml.literal`devtools-text-editor`;
  #shadow = this.attachShadow({ mode: "open" });
  #activeEditor = void 0;
  #dynamicSettings = DynamicSetting.none;
  #activeSettingListeners = [];
  #pendingState;
  #lastScrollPos = { left: 0, top: 0, changed: false };
  #resizeTimeout = -1;
  #resizeListener = () => {
    if (this.#resizeTimeout < 0) {
      this.#resizeTimeout = window.setTimeout(() => {
        this.#resizeTimeout = -1;
        if (this.#activeEditor) {
          CodeMirror.repositionTooltips(this.#activeEditor);
        }
      }, 50);
    }
  };
  #devtoolsResizeObserver = new ResizeObserver(this.#resizeListener);
  constructor(pendingState) {
    super();
    this.#pendingState = pendingState;
    this.#shadow.adoptedStyleSheets = [CodeHighlighter.Style.default];
  }
  #createEditor() {
    this.#activeEditor = new CodeMirror.EditorView({
      state: this.state,
      parent: this.#shadow,
      root: this.#shadow,
      dispatch: (tr) => {
        this.editor.update([tr]);
        if (tr.reconfigured) {
          this.#ensureSettingListeners();
        }
      }
    });
    this.#restoreScrollPosition(this.#activeEditor);
    this.#activeEditor.scrollDOM.addEventListener("scroll", (event) => {
      if (!this.#activeEditor) {
        return;
      }
      this.#saveScrollPosition(this.#activeEditor, {
        scrollLeft: event.target.scrollLeft,
        scrollTop: event.target.scrollTop
      });
      this.scrollEventHandledToSaveScrollPositionForTest();
    });
    this.#ensureSettingListeners();
    this.#startObservingResize();
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      const currentTheme = ThemeSupport.ThemeSupport.instance().themeName() === "dark" ? dummyDarkTheme : [];
      this.editor.dispatch({
        effects: themeSelection.reconfigure(currentTheme)
      });
    });
    return this.#activeEditor;
  }
  get editor() {
    return this.#activeEditor || this.#createEditor();
  }
  dispatch(spec) {
    return this.editor.dispatch(spec);
  }
  get state() {
    if (this.#activeEditor) {
      return this.#activeEditor.state;
    }
    if (!this.#pendingState) {
      this.#pendingState = CodeMirror.EditorState.create({ extensions: baseConfiguration("") });
    }
    return this.#pendingState;
  }
  set state(state) {
    if (this.#pendingState === state) {
      return;
    }
    this.#pendingState = state;
    if (this.#activeEditor) {
      this.#activeEditor.setState(state);
      this.#ensureSettingListeners();
    }
  }
  #restoreScrollPosition(editor) {
    if (!this.#lastScrollPos.changed) {
      return;
    }
    editor.dispatch({
      effects: CodeMirror.EditorView.scrollIntoView(0, {
        x: "start",
        xMargin: -this.#lastScrollPos.left,
        y: "start",
        yMargin: -this.#lastScrollPos.top
      })
    });
  }
  #saveScrollPosition(editor, { scrollLeft, scrollTop }) {
    const contentRect = editor.contentDOM.getBoundingClientRect();
    const coordsAtZero = editor.coordsAtPos(0) ?? {
      top: contentRect.top,
      left: contentRect.left,
      bottom: contentRect.bottom,
      right: contentRect.right
    };
    this.#lastScrollPos.left = scrollLeft + (contentRect.left - coordsAtZero.left);
    this.#lastScrollPos.top = scrollTop + (contentRect.top - coordsAtZero.top);
    this.#lastScrollPos.changed = true;
  }
  scrollEventHandledToSaveScrollPositionForTest() {
  }
  connectedCallback() {
    if (!this.#activeEditor) {
      this.#createEditor();
    } else {
      this.#restoreScrollPosition(this.#activeEditor);
    }
  }
  disconnectedCallback() {
    if (this.#activeEditor) {
      this.#activeEditor.dispatch({ effects: clearHighlightedLine.of(null) });
      this.#pendingState = this.#activeEditor.state;
      this.#devtoolsResizeObserver.disconnect();
      window.removeEventListener("resize", this.#resizeListener);
      this.#activeEditor.destroy();
      this.#activeEditor = void 0;
      this.#ensureSettingListeners();
    }
  }
  focus() {
    if (this.#activeEditor) {
      this.#activeEditor.focus();
    }
  }
  #ensureSettingListeners() {
    const dynamicSettings = this.#activeEditor ? this.#activeEditor.state.facet(dynamicSetting) : DynamicSetting.none;
    if (dynamicSettings === this.#dynamicSettings) {
      return;
    }
    this.#dynamicSettings = dynamicSettings;
    for (const [setting, listener] of this.#activeSettingListeners) {
      setting.removeChangeListener(listener);
    }
    this.#activeSettingListeners = [];
    const settings = Common.Settings.Settings.instance();
    for (const dynamicSetting2 of dynamicSettings) {
      const handler = ({ data }) => {
        const change = dynamicSetting2.sync(this.state, data);
        if (change && this.#activeEditor) {
          this.#activeEditor.dispatch({ effects: change });
        }
      };
      const setting = settings.moduleSetting(dynamicSetting2.settingName);
      setting.addChangeListener(handler);
      this.#activeSettingListeners.push([setting, handler]);
    }
  }
  #startObservingResize() {
    const devtoolsElement = WindowBoundsService.WindowBoundsService.WindowBoundsServiceImpl.instance().getDevToolsBoundingElement();
    if (devtoolsElement) {
      this.#devtoolsResizeObserver.observe(devtoolsElement);
    }
    window.addEventListener("resize", this.#resizeListener);
  }
  revealPosition(selection, highlight = true) {
    const view = this.#activeEditor;
    if (!view) {
      return;
    }
    const line = view.state.doc.lineAt(selection.main.head);
    const effects = [];
    if (highlight) {
      if (!view.state.field(highlightedLineState, false)) {
        view.dispatch({ effects: CodeMirror.StateEffect.appendConfig.of(highlightedLineState) });
      } else {
        view.dispatch({ effects: clearHighlightedLine.of(null) });
      }
      effects.push(setHighlightedLine.of(line.from));
    }
    const editorRect = view.scrollDOM.getBoundingClientRect();
    const targetPos = view.coordsAtPos(selection.main.head);
    if (!targetPos || targetPos.top < editorRect.top || targetPos.bottom > editorRect.bottom) {
      effects.push(CodeMirror.EditorView.scrollIntoView(selection.main, { y: "center" }));
    }
    view.dispatch({
      selection,
      effects,
      userEvent: "select.reveal"
    });
  }
  createSelection(head, anchor) {
    const { doc } = this.state;
    const headPos = toOffset(doc, head);
    return CodeMirror.EditorSelection.single(anchor ? toOffset(doc, anchor) : headPos, headPos);
  }
  toLineColumn(pos) {
    return toLineColumn(this.state.doc, pos);
  }
  toOffset(pos) {
    return toOffset(this.state.doc, pos);
  }
}
ComponentHelpers.CustomElements.defineComponent("devtools-text-editor", TextEditor);
const clearHighlightedLine = CodeMirror.StateEffect.define();
const setHighlightedLine = CodeMirror.StateEffect.define();
const highlightedLineState = CodeMirror.StateField.define({
  create: () => CodeMirror.Decoration.none,
  update(value, tr) {
    if (!tr.changes.empty && value.size) {
      value = value.map(tr.changes);
    }
    for (const effect of tr.effects) {
      if (effect.is(clearHighlightedLine)) {
        value = CodeMirror.Decoration.none;
      } else if (effect.is(setHighlightedLine)) {
        value = CodeMirror.Decoration.set([
          CodeMirror.Decoration.line({ attributes: { class: "cm-highlightedLine" } }).range(effect.value)
        ]);
      }
    }
    return value;
  },
  provide: (field) => CodeMirror.EditorView.decorations.from(field, (value) => value)
});
//# sourceMappingURL=TextEditor.js.map
