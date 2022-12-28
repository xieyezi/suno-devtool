import * as Platform from "../../core/platform/platform.js";
import * as Handlers from "./handlers/handlers.js";
import * as Helpers from "./helpers/helpers.js";
import { TraceProcessor } from "./TraceProcessor.js";
export class Model extends EventTarget {
  #traceProcessor = new TraceProcessor(Handlers.ModelHandlers);
  #traces = [];
  #nextNumberByDomain = /* @__PURE__ */ new Map();
  #recordingsAvailable = [];
  #lastRecordingIndex = 0;
  async parse(traceEvents, metadata = {}, freshRecording = false) {
    const onTraceUpdate = (event) => {
      const { data } = event;
      this.dispatchEvent(new ModelUpdateEvent({ type: ModelUpdateType.TRACE, data }));
    };
    this.#traceProcessor.addEventListener(TraceParseEvent.eventName, onTraceUpdate);
    const file = {
      traceEvents,
      metadata,
      traceParsedData: null
    };
    const traceProcessing = async () => {
      await this.#traceProcessor.parse(traceEvents, freshRecording);
      file.traceParsedData = this.#traceProcessor.data;
      this.#lastRecordingIndex++;
      let recordingName = `Trace ${this.#lastRecordingIndex}`;
      let origin = null;
      if (file.traceParsedData) {
        origin = Helpers.Trace.extractOriginFromTrace(file.traceParsedData.Meta.mainFrameURL);
        if (origin) {
          const nextSequenceForDomain = Platform.MapUtilities.getWithDefault(this.#nextNumberByDomain, origin, () => 1);
          recordingName = `${origin} (${nextSequenceForDomain})`;
          this.#nextNumberByDomain.set(origin, nextSequenceForDomain + 1);
        }
      }
      this.#recordingsAvailable.push(recordingName);
      this.dispatchEvent(new ModelUpdateEvent({ type: ModelUpdateType.TRACE, data: "done" }));
    };
    try {
      await traceProcessing();
      this.#traces.push(file);
    } catch (e) {
      throw e;
    } finally {
      this.#traceProcessor.removeEventListener(TraceParseEvent.eventName, onTraceUpdate);
      this.dispatchEvent(new ModelUpdateEvent({ type: ModelUpdateType.GLOBAL, data: "done" }));
    }
  }
  traceParsedData(index) {
    if (!this.#traces[index]) {
      return null;
    }
    return this.#traces[index].traceParsedData;
  }
  metadata(index) {
    if (!this.#traces[index]) {
      return null;
    }
    return this.#traces[index].metadata;
  }
  traceEvents(index) {
    if (!this.#traces[index]) {
      return null;
    }
    return this.#traces[index].traceEvents;
  }
  size() {
    return this.#traces.length;
  }
  deleteTraceByIndex(recordingIndex) {
    this.#traces.splice(recordingIndex, 1);
    this.#recordingsAvailable.splice(recordingIndex, 1);
  }
  getRecordingsAvailable() {
    return this.#recordingsAvailable;
  }
  reset() {
    this.#traceProcessor.reset();
  }
}
export var ModelUpdateType = /* @__PURE__ */ ((ModelUpdateType2) => {
  ModelUpdateType2[ModelUpdateType2["GLOBAL"] = 0] = "GLOBAL";
  ModelUpdateType2[ModelUpdateType2["TRACE"] = 1] = "TRACE";
  ModelUpdateType2[ModelUpdateType2["LIGHTHOUSE"] = 2] = "LIGHTHOUSE";
  return ModelUpdateType2;
})(ModelUpdateType || {});
export class ModelUpdateEvent extends Event {
  constructor(data) {
    super(ModelUpdateEvent.eventName);
    this.data = data;
  }
  static eventName = "modelupdate";
}
export function isModelUpdateEventDataGlobal(object) {
  return object.type === 0 /* GLOBAL */;
}
export function isModelUpdateEventDataTrace(object) {
  return object.type === 1 /* TRACE */;
}
export class TraceParseEvent extends Event {
  constructor(data, init = { bubbles: true }) {
    super(TraceParseEvent.eventName, init);
    this.data = data;
  }
  static eventName = "traceparse";
}
//# sourceMappingURL=ModelImpl.js.map
