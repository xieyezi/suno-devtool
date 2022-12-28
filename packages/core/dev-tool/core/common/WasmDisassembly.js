import * as Platform from "../platform/platform.js";
export class WasmDisassembly {
  lines;
  #offsets;
  #functionBodyOffsets;
  constructor(lines, offsets, functionBodyOffsets) {
    if (lines.length !== offsets.length) {
      throw new Error("Lines and offsets don't match");
    }
    this.lines = lines;
    this.#offsets = offsets;
    this.#functionBodyOffsets = functionBodyOffsets;
  }
  get lineNumbers() {
    return this.#offsets.length;
  }
  bytecodeOffsetToLineNumber(bytecodeOffset) {
    return Platform.ArrayUtilities.upperBound(this.#offsets, bytecodeOffset, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
  }
  lineNumberToBytecodeOffset(lineNumber) {
    return this.#offsets[lineNumber];
  }
  *nonBreakableLineNumbers() {
    let lineNumber = 0;
    let functionIndex = 0;
    while (lineNumber < this.lineNumbers) {
      if (functionIndex < this.#functionBodyOffsets.length) {
        const offset = this.lineNumberToBytecodeOffset(lineNumber);
        if (offset >= this.#functionBodyOffsets[functionIndex].start) {
          lineNumber = this.bytecodeOffsetToLineNumber(this.#functionBodyOffsets[functionIndex++].end) + 1;
          continue;
        }
      }
      yield lineNumber++;
    }
  }
}
//# sourceMappingURL=WasmDisassembly.js.map
