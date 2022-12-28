import * as Platform from "../../core/platform/platform.js";
import * as Root from "../../core/root/root.js";
import * as Acorn from "../../third_party/acorn/acorn.js";
import { AcornTokenizer, ECMA_VERSION } from "./AcornTokenizer.js";
import { CSSFormatter } from "./CSSFormatter.js";
import { FormattedContentBuilder } from "./FormattedContentBuilder.js";
import { FormattableMediaTypes } from "./FormatterActions.js";
import { HTMLFormatter } from "./HTMLFormatter.js";
import { IdentityFormatter } from "./IdentityFormatter.js";
import { JavaScriptFormatter } from "./JavaScriptFormatter.js";
import { JSONFormatter } from "./JSONFormatter.js";
import { substituteExpression } from "./Substitute.js";
export function createTokenizer(mimeType) {
  const mode = CodeMirror.getMode({ indentUnit: 2 }, mimeType);
  const state = CodeMirror.startState(mode);
  if (!mode || mode.name === "null") {
    throw new Error(`Could not find CodeMirror mode for MimeType: ${mimeType}`);
  }
  if (!mode.token) {
    throw new Error(`Could not find CodeMirror mode with token method: ${mimeType}`);
  }
  return (line, callback) => {
    const stream = new CodeMirror.StringStream(line);
    while (!stream.eol()) {
      const style = mode.token(stream, state);
      const value = stream.current();
      if (callback(value, style, stream.start, stream.start + value.length) === AbortTokenization) {
        return;
      }
      stream.start = stream.pos;
    }
  };
}
export const AbortTokenization = {};
export function evaluatableJavaScriptSubstring(content) {
  try {
    const tokenizer = Acorn.tokenizer(content, { ecmaVersion: ECMA_VERSION });
    let token = tokenizer.getToken();
    while (AcornTokenizer.punctuator(token)) {
      token = tokenizer.getToken();
    }
    const startIndex = token.start;
    let endIndex = token.end;
    while (token.type !== Acorn.tokTypes.eof) {
      const isIdentifier = token.type === Acorn.tokTypes.name || token.type === Acorn.tokTypes.privateId;
      const isThis = AcornTokenizer.keyword(token, "this");
      const isString = token.type === Acorn.tokTypes.string;
      if (!isThis && !isIdentifier && !isString) {
        break;
      }
      endIndex = token.end;
      token = tokenizer.getToken();
      while (AcornTokenizer.punctuator(token, "[")) {
        let openBracketCounter = 0;
        do {
          if (AcornTokenizer.punctuator(token, "[")) {
            ++openBracketCounter;
          }
          token = tokenizer.getToken();
          if (AcornTokenizer.punctuator(token, "]")) {
            if (--openBracketCounter === 0) {
              endIndex = token.end;
              token = tokenizer.getToken();
              break;
            }
          }
        } while (token.type !== Acorn.tokTypes.eof);
      }
      if (!AcornTokenizer.punctuator(token, ".")) {
        break;
      }
      token = tokenizer.getToken();
    }
    return content.substring(startIndex, endIndex);
  } catch (e) {
    console.error(e);
    return "";
  }
}
export function format(mimeType, text, indentString) {
  indentString = indentString || "    ";
  let result;
  const builder = new FormattedContentBuilder(indentString);
  const lineEndings = Platform.StringUtilities.findLineEndingIndexes(text);
  try {
    switch (mimeType) {
      case FormattableMediaTypes.TEXT_HTML: {
        const formatter = new HTMLFormatter(builder);
        formatter.format(text, lineEndings);
        break;
      }
      case FormattableMediaTypes.TEXT_CSS:
      case FormattableMediaTypes.TEXT_X_SCSS: {
        const formatter = new CSSFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      case FormattableMediaTypes.APPLICATION_JAVASCRIPT:
      case FormattableMediaTypes.TEXT_JAVASCRIPT: {
        const formatter = new JavaScriptFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      case FormattableMediaTypes.APPLICATION_JSON:
      case FormattableMediaTypes.APPLICATION_MANIFEST_JSON: {
        const formatter = new JSONFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      default: {
        const formatter = new IdentityFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
      }
    }
    result = {
      mapping: builder.mapping,
      content: builder.content()
    };
  } catch (e) {
    console.error(e);
    result = {
      mapping: { original: [0], formatted: [0] },
      content: text
    };
  }
  return result;
}
(function disableLoggingForTest() {
  if (Root.Runtime.Runtime.queryParam("test")) {
    console.error = () => void 0;
  }
})();
export { substituteExpression };
//# sourceMappingURL=FormatterWorker.js.map
