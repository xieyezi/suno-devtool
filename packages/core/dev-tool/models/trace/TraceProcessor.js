import { TraceParseEvent } from "./ModelImpl.js";
var Status = /* @__PURE__ */ ((Status2) => {
  Status2[Status2["IDLE"] = 0] = "IDLE";
  Status2[Status2["PARSING"] = 1] = "PARSING";
  Status2[Status2["FINISHED_PARSING"] = 2] = "FINISHED_PARSING";
  Status2[Status2["ERRORED_WHILE_PARSING"] = 3] = "ERRORED_WHILE_PARSING";
  return Status2;
})(Status || {});
export class TraceProcessor extends EventTarget {
  #traceHandlers;
  #pauseDuration;
  #pauseFrequencyMs;
  #status = 0 /* IDLE */;
  constructor(traceHandlers, { pauseDuration = 20, pauseFrequencyMs = 100 } = {}) {
    super();
    this.#traceHandlers = traceHandlers;
    this.#pauseDuration = pauseDuration;
    this.#pauseFrequencyMs = pauseFrequencyMs;
  }
  reset() {
    if (this.#status === 1 /* PARSING */) {
      throw new Error("Trace processor can't reset while parsing.");
    }
    const handlers = Object.values(this.#traceHandlers);
    for (const handler of handlers) {
      handler.reset();
    }
    this.#status = 0 /* IDLE */;
  }
  async parse(traceEvents, freshRecording = false) {
    if (this.#status !== 0 /* IDLE */) {
      throw new Error("Trace processor can't start parsing when not idle.");
    }
    try {
      this.#status = 1 /* PARSING */;
      await this.#parse(traceEvents, freshRecording);
      this.#status = 2 /* FINISHED_PARSING */;
    } catch (e) {
      this.#status = 3 /* ERRORED_WHILE_PARSING */;
      throw e;
    }
  }
  async #parse(traceEvents, freshRecording) {
    const traceEventIterator = new TraceEventIterator(traceEvents, this.#pauseDuration, this.#pauseFrequencyMs);
    const sortedHandlers = [...sortHandlers(this.#traceHandlers).values()];
    for (const handler of sortedHandlers) {
      handler.reset();
    }
    for (const handler of sortedHandlers) {
      handler.initialize?.(freshRecording);
    }
    for await (const item of traceEventIterator) {
      if (item.kind === IteratorItemType.STATUS_UPDATE) {
        this.dispatchEvent(new TraceParseEvent(item.data));
        continue;
      }
      for (const handler of sortedHandlers) {
        handler.handleEvent(item.data);
      }
    }
    for (const handler of sortedHandlers) {
      await handler.finalize?.();
    }
  }
  get data() {
    if (this.#status !== 2 /* FINISHED_PARSING */) {
      return null;
    }
    const data = {};
    for (const [name, handler] of Object.entries(this.#traceHandlers)) {
      Object.assign(data, { [name]: handler.data() });
    }
    return data;
  }
}
export function sortHandlers(traceHandlers) {
  const sortedMap = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  const visitHandler = (handlerName) => {
    if (sortedMap.has(handlerName)) {
      return;
    }
    if (visited.has(handlerName)) {
      let stackPath = "";
      for (const handler2 of visited) {
        if (stackPath || handler2 === handlerName) {
          stackPath += `${handler2}->`;
        }
      }
      stackPath += handlerName;
      throw new Error(`Found dependency cycle in trace event handlers: ${stackPath}`);
    }
    visited.add(handlerName);
    const handler = traceHandlers[handlerName];
    if (!handler) {
      return;
    }
    const deps = handler.deps?.();
    if (deps) {
      deps.forEach(visitHandler);
    }
    sortedMap.set(handlerName, handler);
  };
  for (const handlerName of Object.keys(traceHandlers)) {
    visitHandler(handlerName);
  }
  return sortedMap;
}
var IteratorItemType = /* @__PURE__ */ ((IteratorItemType2) => {
  IteratorItemType2[IteratorItemType2["TRACE_EVENT"] = 1] = "TRACE_EVENT";
  IteratorItemType2[IteratorItemType2["STATUS_UPDATE"] = 2] = "STATUS_UPDATE";
  return IteratorItemType2;
})(IteratorItemType || {});
class TraceEventIterator {
  constructor(traceEvents, pauseDuration, pauseFrequencyMs) {
    this.traceEvents = traceEvents;
    this.pauseDuration = pauseDuration;
    this.pauseFrequencyMs = pauseFrequencyMs;
    this.#time = performance.now();
  }
  #time;
  async *[Symbol.asyncIterator]() {
    for (let i = 0, length = this.traceEvents.length; i < length; i++) {
      if (performance.now() - this.#time > this.pauseFrequencyMs) {
        this.#time = performance.now();
        yield { kind: 2 /* STATUS_UPDATE */, data: { index: i, total: length } };
        await new Promise((resolve) => setTimeout(resolve, this.pauseDuration));
      }
      yield { kind: 1 /* TRACE_EVENT */, data: this.traceEvents[i] };
    }
  }
}
//# sourceMappingURL=TraceProcessor.js.map
