export function toOffset(doc, { lineNumber, columnNumber }) {
  const line = doc.line(Math.max(1, Math.min(doc.lines, lineNumber + 1)));
  return Math.max(line.from, Math.min(line.to, line.from + columnNumber));
}
export function toLineColumn(doc, offset) {
  offset = Math.max(0, Math.min(offset, doc.length));
  const line = doc.lineAt(offset);
  return { lineNumber: line.number - 1, columnNumber: offset - line.from };
}
//# sourceMappingURL=position.js.map
