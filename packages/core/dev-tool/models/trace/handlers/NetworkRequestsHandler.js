import * as Platform from "../../../core/platform/platform.js";
import { HandlerState } from "./types.js";
import { data as metaHandlerData } from "./MetaHandler.js";
import * as Types from "../types/types.js";
const MILLISECONDS_TO_MICROSECONDS = 1e3;
const SECONDS_TO_MICROSECONDS = 1e6;
const requestMap = /* @__PURE__ */ new Map();
const requestsByOrigin = /* @__PURE__ */ new Map();
const requestsByTime = [];
function storeTraceEventWithRequestId(requestId, key, value) {
  if (!requestMap.has(requestId)) {
    requestMap.set(requestId, {});
  }
  const traceEvents = requestMap.get(requestId);
  if (!traceEvents) {
    throw new Error(`Unable to locate trace events for request ID ${requestId}`);
  }
  if (Array.isArray(traceEvents[key])) {
    const target = traceEvents[key];
    const values = value;
    target.push(...values);
  } else {
    traceEvents[key] = value;
  }
}
function firstPositiveValueInList(entries) {
  for (const entry of entries) {
    if (entry > 0) {
      return entry;
    }
  }
  return 0;
}
let handlerState = HandlerState.UNINITIALIZED;
export function reset() {
  requestsByOrigin.clear();
  requestMap.clear();
  requestsByTime.length = 0;
  handlerState = HandlerState.INITIALIZED;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Network Request handler is not initialized");
  }
  if (Types.TraceEvents.isTraceEventResourceWillSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "willSendRequests", [event]);
    return;
  }
  if (Types.TraceEvents.isTraceEventResourceSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "sendRequests", [event]);
    return;
  }
  if (Types.TraceEvents.isTraceEventResourceReceiveResponse(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "receiveResponse", event);
    return;
  }
  if (Types.TraceEvents.isTraceEventResourceReceivedData(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "receivedData", [event]);
    return;
  }
  if (Types.TraceEvents.isTraceEventResourceFinish(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "resourceFinish", event);
    return;
  }
}
export async function finalize() {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Network Request handler is not initialized");
  }
  const { rendererProcessesByFrame } = metaHandlerData();
  for (const [requestId, request] of requestMap.entries()) {
    if (!request.sendRequests || !request.receiveResponse) {
      continue;
    }
    const redirects = [];
    for (let i = 0; i < request.sendRequests.length - 1; i++) {
      const sendRequest = request.sendRequests[i];
      const nextSendRequest = request.sendRequests[i + 1];
      let ts = sendRequest.ts;
      let dur = Types.Timing.MicroSeconds(nextSendRequest.ts - sendRequest.ts);
      if (request.willSendRequests && request.willSendRequests[i] && request.willSendRequests[i + 1]) {
        const willSendRequest = request.willSendRequests[i];
        const nextWillSendRequest = request.willSendRequests[i + 1];
        ts = willSendRequest.ts;
        dur = Types.Timing.MicroSeconds(nextWillSendRequest.ts - willSendRequest.ts);
      }
      redirects.push({
        url: sendRequest.args.data.url,
        priority: sendRequest.args.data.priority,
        ts,
        dur
      });
    }
    const firstSendRequest = request.sendRequests[0];
    const finalSendRequest = request.sendRequests[request.sendRequests.length - 1];
    const { timing } = request.receiveResponse.args.data;
    if (!timing) {
      continue;
    }
    const startTime = request.willSendRequests && request.willSendRequests.length ? Types.Timing.MicroSeconds(request.willSendRequests[0].ts) : Types.Timing.MicroSeconds(firstSendRequest.ts);
    const endRedirectTime = request.willSendRequests && request.willSendRequests.length ? Types.Timing.MicroSeconds(request.willSendRequests[request.willSendRequests.length - 1].ts) : Types.Timing.MicroSeconds(finalSendRequest.ts);
    const endTime = request.resourceFinish ? request.resourceFinish.ts : endRedirectTime;
    const finishTime = request.resourceFinish ? Types.Timing.MicroSeconds(request.resourceFinish.args.data.finishTime * SECONDS_TO_MICROSECONDS) : Types.Timing.MicroSeconds(endTime);
    const networkDuration = Types.Timing.MicroSeconds((finishTime || endRedirectTime) - endRedirectTime);
    const processingDuration = Types.Timing.MicroSeconds(endTime - (finishTime || endTime));
    const redirectionDuration = Types.Timing.MicroSeconds(endRedirectTime - startTime);
    const queueing = Types.Timing.MicroSeconds(Platform.NumberUtilities.clamp(timing.requestTime * SECONDS_TO_MICROSECONDS - endRedirectTime, 0, Number.MAX_VALUE));
    const stalled = Types.Timing.MicroSeconds(firstPositiveValueInList([
      timing.dnsStart * MILLISECONDS_TO_MICROSECONDS,
      timing.connectStart * MILLISECONDS_TO_MICROSECONDS,
      timing.sendStart * MILLISECONDS_TO_MICROSECONDS,
      request.receiveResponse.ts - endRedirectTime
    ]));
    const waiting = Types.Timing.MicroSeconds((timing.receiveHeadersEnd - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS);
    const downloadStart = Types.Timing.MicroSeconds(timing.requestTime * SECONDS_TO_MICROSECONDS + timing.receiveHeadersEnd * MILLISECONDS_TO_MICROSECONDS);
    const download = Types.Timing.MicroSeconds((finishTime || downloadStart) - downloadStart);
    const totalTime = Types.Timing.MicroSeconds(networkDuration + processingDuration);
    const dnsLookup = Types.Timing.MicroSeconds((timing.dnsEnd - timing.dnsStart) * MILLISECONDS_TO_MICROSECONDS);
    const ssl = Types.Timing.MicroSeconds((timing.sslEnd - timing.sslStart) * MILLISECONDS_TO_MICROSECONDS);
    const proxyNegotiation = Types.Timing.MicroSeconds((timing.proxyEnd - timing.proxyStart) * MILLISECONDS_TO_MICROSECONDS);
    const requestSent = Types.Timing.MicroSeconds((timing.sendEnd - timing.sendStart) * MILLISECONDS_TO_MICROSECONDS);
    const initialConnection = Types.Timing.MicroSeconds((timing.connectEnd - timing.connectStart) * MILLISECONDS_TO_MICROSECONDS);
    const { priority, frame, url, renderBlocking } = finalSendRequest.args.data;
    const { mimeType, fromCache, fromServiceWorker } = request.receiveResponse.args.data;
    const { encodedDataLength, decodedBodyLength } = request.resourceFinish ? request.resourceFinish.args.data : { encodedDataLength: 0, decodedBodyLength: 0 };
    const { receiveHeadersEnd, requestTime, sendEnd, sendStart, sslStart } = timing;
    const { host, protocol, pathname, search } = new URL(url);
    const isHttps = protocol === "https:";
    const renderProcesses = rendererProcessesByFrame.get(frame);
    const processInfo = renderProcesses?.get(finalSendRequest.pid);
    const requestingFrameUrl = processInfo ? processInfo.frame.url : "";
    const networkEvent = {
      args: {
        data: {
          decodedBodyLength,
          dnsLookup,
          download,
          encodedDataLength,
          finishTime,
          frame,
          fromCache,
          fromServiceWorker,
          initialConnection,
          host,
          isHttps,
          mimeType,
          networkDuration,
          pathname,
          search,
          priority,
          processingDuration,
          protocol,
          proxyNegotiation,
          redirectionDuration,
          queueing,
          receiveHeadersEnd: Types.Timing.MicroSeconds(receiveHeadersEnd),
          redirects,
          requestId,
          renderBlocking: renderBlocking ? renderBlocking : "non_blocking",
          requestSent,
          requestTime,
          requestingFrameUrl,
          sendEnd: Types.Timing.MicroSeconds(sendEnd * MILLISECONDS_TO_MICROSECONDS),
          sendStart: Types.Timing.MicroSeconds(sendStart * MILLISECONDS_TO_MICROSECONDS),
          ssl,
          sslStart: Types.Timing.MicroSeconds(sslStart * MILLISECONDS_TO_MICROSECONDS),
          stalled,
          statusCode: request.receiveResponse.args.data.statusCode,
          stackTrace: finalSendRequest.args.data.stackTrace,
          totalTime,
          url,
          waiting
        }
      },
      cat: "loading",
      name: "SyntheticNetworkRequest",
      ph: Types.TraceEvents.TraceEventPhase.COMPLETE,
      dur: Types.Timing.MicroSeconds(endTime - startTime),
      tdur: Types.Timing.MicroSeconds(endTime - startTime),
      ts: Types.Timing.MicroSeconds(startTime),
      tts: Types.Timing.MicroSeconds(startTime),
      pid: finalSendRequest.pid,
      tid: finalSendRequest.tid
    };
    if (networkEvent.args.data.fromCache) {
      networkEvent.args.data.queueing = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.waiting = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.dnsLookup = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.initialConnection = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.ssl = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.requestSent = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.proxyNegotiation = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.networkDuration = Types.Timing.MicroSeconds(0);
      const endStalled = request.receiveResponse ? request.receiveResponse.ts : startTime;
      networkEvent.args.data.stalled = Types.Timing.MicroSeconds(endStalled - startTime);
      networkEvent.args.data.download = Types.Timing.MicroSeconds(endTime - endStalled);
    }
    const requests = Platform.MapUtilities.getWithDefault(requestsByOrigin, host, () => {
      return {
        renderBlocking: [],
        nonRenderBlocking: [],
        all: []
      };
    });
    if (networkEvent.args.data.renderBlocking === "non_blocking") {
      requests.nonRenderBlocking.push(networkEvent);
    } else {
      requests.renderBlocking.push(networkEvent);
    }
    requests.all.push(networkEvent);
    requestsByTime.push(networkEvent);
  }
  handlerState = HandlerState.FINALIZED;
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("Network Request handler is not finalized");
  }
  return {
    byOrigin: new Map(requestsByOrigin),
    byTime: [...requestsByTime]
  };
}
export function deps() {
  return ["Meta"];
}
//# sourceMappingURL=NetworkRequestsHandler.js.map
