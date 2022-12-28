import * as TextUtils from "../../models/text_utils/text_utils.js";
import { HeapSnapshotProgress, JSHeapSnapshot } from "./HeapSnapshot.js";
export class HeapSnapshotLoader {
  #progress;
  #buffer;
  #dataCallback;
  #done;
  #snapshot;
  #array;
  #arrayIndex;
  #json;
  #jsonTokenizer;
  constructor(dispatcher) {
    this.#reset();
    this.#progress = new HeapSnapshotProgress(dispatcher);
    this.#buffer = "";
    this.#dataCallback = null;
    this.#done = false;
    void this.#parseInput();
  }
  dispose() {
    this.#reset();
  }
  #reset() {
    this.#json = "";
    this.#snapshot = void 0;
  }
  close() {
    this.#done = true;
    if (this.#dataCallback) {
      this.#dataCallback("");
    }
  }
  buildSnapshot() {
    this.#snapshot = this.#snapshot || {};
    this.#progress.updateStatus("Processing snapshot\u2026");
    const result = new JSHeapSnapshot(this.#snapshot, this.#progress);
    this.#reset();
    return result;
  }
  #parseUintArray() {
    let index = 0;
    const char0 = "0".charCodeAt(0);
    const char9 = "9".charCodeAt(0);
    const closingBracket = "]".charCodeAt(0);
    const length = this.#json.length;
    while (true) {
      while (index < length) {
        const code = this.#json.charCodeAt(index);
        if (char0 <= code && code <= char9) {
          break;
        } else if (code === closingBracket) {
          this.#json = this.#json.slice(index + 1);
          return false;
        }
        ++index;
      }
      if (index === length) {
        this.#json = "";
        return true;
      }
      let nextNumber = 0;
      const startIndex = index;
      while (index < length) {
        const code = this.#json.charCodeAt(index);
        if (char0 > code || code > char9) {
          break;
        }
        nextNumber *= 10;
        nextNumber += code - char0;
        ++index;
      }
      if (index === length) {
        this.#json = this.#json.slice(startIndex);
        return true;
      }
      if (!this.#array) {
        throw new Error("Array not instantiated");
      }
      this.#array[this.#arrayIndex++] = nextNumber;
    }
  }
  #parseStringsArray() {
    this.#progress.updateStatus("Parsing strings\u2026");
    const closingBracketIndex = this.#json.lastIndexOf("]");
    if (closingBracketIndex === -1) {
      throw new Error("Incomplete JSON");
    }
    this.#json = this.#json.slice(0, closingBracketIndex + 1);
    if (!this.#snapshot) {
      throw new Error("No snapshot in parseStringsArray");
    }
    this.#snapshot.strings = JSON.parse(this.#json);
  }
  write(chunk) {
    this.#buffer += chunk;
    if (!this.#dataCallback) {
      return;
    }
    this.#dataCallback(this.#buffer);
    this.#dataCallback = null;
    this.#buffer = "";
  }
  #fetchChunk() {
    return this.#done ? Promise.resolve(this.#buffer) : new Promise((r) => {
      this.#dataCallback = r;
    });
  }
  async #findToken(token, startIndex) {
    while (true) {
      const pos = this.#json.indexOf(token, startIndex || 0);
      if (pos !== -1) {
        return pos;
      }
      startIndex = this.#json.length - token.length + 1;
      this.#json += await this.#fetchChunk();
    }
  }
  async #parseArray(name, title, length) {
    const nameIndex = await this.#findToken(name);
    const bracketIndex = await this.#findToken("[", nameIndex);
    this.#json = this.#json.slice(bracketIndex + 1);
    this.#array = length ? new Uint32Array(length) : [];
    this.#arrayIndex = 0;
    while (this.#parseUintArray()) {
      if (length) {
        this.#progress.updateProgress(title, this.#arrayIndex, this.#array.length);
      } else {
        this.#progress.updateStatus(title);
      }
      this.#json += await this.#fetchChunk();
    }
    const result = this.#array;
    this.#array = null;
    return result;
  }
  async #parseInput() {
    const snapshotToken = '"snapshot"';
    const snapshotTokenIndex = await this.#findToken(snapshotToken);
    if (snapshotTokenIndex === -1) {
      throw new Error("Snapshot token not found");
    }
    this.#progress.updateStatus("Loading snapshot info\u2026");
    const json = this.#json.slice(snapshotTokenIndex + snapshotToken.length + 1);
    this.#jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer((metaJSON) => {
      this.#json = this.#jsonTokenizer.remainder();
      this.#jsonTokenizer = null;
      this.#snapshot = this.#snapshot || {};
      this.#snapshot.snapshot = JSON.parse(metaJSON);
    });
    this.#jsonTokenizer.write(json);
    while (this.#jsonTokenizer) {
      this.#jsonTokenizer.write(await this.#fetchChunk());
    }
    this.#snapshot = this.#snapshot || {};
    const nodes = await this.#parseArray('"nodes"', "Loading nodes\u2026 {PH1}%", this.#snapshot.snapshot.meta.node_fields.length * this.#snapshot.snapshot.node_count);
    this.#snapshot.nodes = nodes;
    const edges = await this.#parseArray('"edges"', "Loading edges\u2026 {PH1}%", this.#snapshot.snapshot.meta.edge_fields.length * this.#snapshot.snapshot.edge_count);
    this.#snapshot.edges = edges;
    if (this.#snapshot.snapshot.trace_function_count) {
      const traceFunctionInfos = await this.#parseArray('"trace_function_infos"', "Loading allocation traces\u2026 {PH1}%", this.#snapshot.snapshot.meta.trace_function_info_fields.length * this.#snapshot.snapshot.trace_function_count);
      this.#snapshot.trace_function_infos = traceFunctionInfos;
      const thisTokenEndIndex = await this.#findToken(":");
      const nextTokenIndex = await this.#findToken('"', thisTokenEndIndex);
      const openBracketIndex = this.#json.indexOf("[");
      const closeBracketIndex = this.#json.lastIndexOf("]", nextTokenIndex);
      this.#snapshot.trace_tree = JSON.parse(this.#json.substring(openBracketIndex, closeBracketIndex + 1));
      this.#json = this.#json.slice(closeBracketIndex + 1);
    }
    if (this.#snapshot.snapshot.meta.sample_fields) {
      const samples = await this.#parseArray('"samples"', "Loading samples\u2026");
      this.#snapshot.samples = samples;
    }
    if (this.#snapshot.snapshot.meta["location_fields"]) {
      const locations = await this.#parseArray('"locations"', "Loading locations\u2026");
      this.#snapshot.locations = locations;
    } else {
      this.#snapshot.locations = [];
    }
    this.#progress.updateStatus("Loading strings\u2026");
    const stringsTokenIndex = await this.#findToken('"strings"');
    const bracketIndex = await this.#findToken("[", stringsTokenIndex);
    this.#json = this.#json.slice(bracketIndex);
    while (!this.#done) {
      this.#json += await this.#fetchChunk();
    }
    this.#parseStringsArray();
  }
}
//# sourceMappingURL=HeapSnapshotLoader.js.map
