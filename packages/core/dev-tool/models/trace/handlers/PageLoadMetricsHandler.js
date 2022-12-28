import * as Platform from "../../../core/platform/platform.js";
import * as Helpers from "../helpers/helpers.js";
import { KnownEventName } from "./types.js";
import * as Types from "../types/types.js";
import { data as metaHandlerData } from "./MetaHandler.js";
import { data as rendererHandlerData } from "./RendererHandler.js";
const metricScoresByFrameId = /* @__PURE__ */ new Map();
export function reset() {
  metricScoresByFrameId.clear();
  pageLoadEventsArray = [];
  selectedLCPCandidateEvents.clear();
}
let pageLoadEventsArray = [];
const selectedLCPCandidateEvents = /* @__PURE__ */ new Set();
function eventIsPageLoadEvent(event) {
  return Types.TraceEvents.isTraceEventFirstContentfulPaint(event) || Types.TraceEvents.isTraceEventMarkDOMContent(event) || Types.TraceEvents.isTraceEventInteractiveTime(event) || Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event);
}
export function handleEvent(event) {
  if (!eventIsPageLoadEvent(event)) {
    return;
  }
  pageLoadEventsArray.push(event);
}
function storePageLoadMetricAgainstNavigationId(navigation, event) {
  const navigationId = navigation.args.data?.navigationId;
  if (!navigationId) {
    throw new Error("Navigation event unexpectedly had no navigation ID.");
  }
  const frameId = getFrameIdForPageLoadEvent(event);
  const { rendererProcessesByFrame } = metaHandlerData();
  const processData = rendererProcessesByFrame.get(frameId)?.get(event.pid);
  if (!processData) {
    throw new Error("No processes found for page load event.");
  }
  const eventBelongsToProcess = event.ts >= processData.window.min && event.ts <= processData.window.max;
  if (!eventBelongsToProcess) {
    return;
  }
  if (Types.TraceEvents.isTraceEventFirstContentfulPaint(event)) {
    const fcpTime = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const score = Helpers.Timing.formatMicrosecondsTime(fcpTime, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2
    });
    const classification = scoreClassificationForFirstContentfulPaint(fcpTime);
    const metricScore = { event, score, metricName: MetricName.FCP, classification, navigation };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }
  if (Types.TraceEvents.isTraceEventMarkDOMContent(event)) {
    const dclTime = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const score = Helpers.Timing.formatMicrosecondsTime(dclTime, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2
    });
    const metricScore = {
      event,
      score,
      metricName: MetricName.DCL,
      classification: scoreClassificationForDOMContentLoaded(dclTime),
      navigation
    };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }
  if (Types.TraceEvents.isTraceEventInteractiveTime(event)) {
    const ttiValue = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const ttiScore = Helpers.Timing.formatMicrosecondsTime(ttiValue, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2
    });
    const tti = {
      event,
      score: ttiScore,
      metricName: MetricName.TTI,
      classification: scoreClassificationForTimeToInteractive(ttiValue),
      navigation
    };
    storeMetricScore(frameId, navigationId, tti);
    const tbtValue = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(event.args.args.total_blocking_time_ms));
    const tbtScore = Helpers.Timing.formatMicrosecondsTime(tbtValue, {
      format: Types.Timing.TimeUnit.MILLISECONDS,
      maximumFractionDigits: 2
    });
    const tbt = {
      event,
      score: tbtScore,
      metricName: MetricName.TBT,
      classification: scoreClassificationForTotalBlockingTime(tbtValue),
      navigation
    };
    storeMetricScore(frameId, navigationId, tbt);
    return;
  }
  if (Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event)) {
    const candidateIndex = event.args.data?.candidateIndex;
    if (!candidateIndex) {
      throw new Error("Largest Contenful Paint unexpectedly had no candidateIndex.");
    }
    const lcpTime = Types.Timing.MicroSeconds(event.ts - navigation.ts);
    const lcpScore = Helpers.Timing.formatMicrosecondsTime(lcpTime, {
      format: Types.Timing.TimeUnit.SECONDS,
      maximumFractionDigits: 2
    });
    const lcp = {
      event,
      score: lcpScore,
      metricName: MetricName.LCP,
      classification: scoreClassificationForLargestContentfulPaint(lcpTime),
      navigation
    };
    const metricsByNavigation = Platform.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => /* @__PURE__ */ new Map());
    const metrics = Platform.MapUtilities.getWithDefault(metricsByNavigation, navigationId, () => /* @__PURE__ */ new Map());
    const lastLCPCandidate = metrics.get(MetricName.LCP);
    if (lastLCPCandidate === void 0) {
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigationId, lcp);
      return;
    }
    const lastLCPCandidateEvent = lastLCPCandidate.event;
    if (!Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(lastLCPCandidateEvent)) {
      return;
    }
    const lastCandidateIndex = lastLCPCandidateEvent.args.data?.candidateIndex;
    if (!lastCandidateIndex) {
      return;
    }
    if (lastCandidateIndex < candidateIndex) {
      selectedLCPCandidateEvents.delete(lastLCPCandidateEvent);
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigationId, lcp);
    }
    return;
  }
  if (Types.TraceEvents.isTraceEventLayoutShift(event)) {
    return;
  }
  return Platform.assertNever(event, `Unexpected event type: ${event}`);
}
function storeMetricScore(frameId, navigationId, metricScore) {
  const metricsByNavigation = Platform.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => /* @__PURE__ */ new Map());
  const metrics = Platform.MapUtilities.getWithDefault(metricsByNavigation, navigationId, () => /* @__PURE__ */ new Map());
  metrics.delete(metricScore.metricName);
  metrics.set(metricScore.metricName, metricScore);
}
function getFrameIdForPageLoadEvent(event) {
  if (Types.TraceEvents.isTraceEventFirstContentfulPaint(event) || Types.TraceEvents.isTraceEventInteractiveTime(event) || Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event) || Types.TraceEvents.isTraceEventLayoutShift(event)) {
    return event.args.frame;
  }
  if (Types.TraceEvents.isTraceEventMarkDOMContent(event)) {
    const frameId = event.args.data?.frame;
    if (!frameId) {
      throw new Error("MarkDOMContent unexpectedly had no frame ID.");
    }
    return frameId;
  }
  Platform.assertNever(event, `Unexpected event type: ${event}`);
}
function getNavigationForPageLoadEvent(event) {
  if (Types.TraceEvents.isTraceEventFirstContentfulPaint(event) || Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event)) {
    const navigationId = event.args.data?.navigationId;
    if (!navigationId) {
      throw new Error("Trace event unexpectedly had no navigation ID.");
    }
    const { navigationsByNavigationId } = metaHandlerData();
    const navigation = navigationsByNavigationId.get(navigationId);
    if (!navigation) {
      return null;
    }
    return navigation;
  }
  if (Types.TraceEvents.isTraceEventMarkDOMContent(event) || Types.TraceEvents.isTraceEventInteractiveTime(event) || Types.TraceEvents.isTraceEventLayoutShift(event)) {
    const frameId = getFrameIdForPageLoadEvent(event);
    const { navigationsByFrameId } = metaHandlerData();
    return Helpers.Trace.getNavigationForTraceEvent(event, frameId, navigationsByFrameId);
  }
  return Platform.assertNever(event, `Unexpected event type: ${event}`);
}
function estimateTotalBlockingTimes() {
  const { processes } = rendererHandlerData();
  const LONG_TASK_THRESHOLD = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(50));
  for (const [frameId, metricsByNavigation] of metricScoresByFrameId) {
    for (const [navigationId, metrics] of metricsByNavigation) {
      const navigationTBT = metrics.get(MetricName.TBT);
      const navigationFCP = metrics.get(MetricName.FCP);
      if (navigationTBT || !navigationFCP) {
        continue;
      }
      if (!navigationFCP.event) {
        continue;
      }
      const renderer = processes.get(navigationFCP.event.pid);
      if (!renderer) {
        continue;
      }
      const mainThread = [...renderer.threads.values()].find((thread) => thread.name === "CrRendererMain");
      const mainThreadTree = mainThread?.tree;
      if (!mainThread || !mainThreadTree) {
        throw new Error("Main thread not found.");
      }
      const mainThreadEvents = mainThread.events;
      const mainThreadNodes = mainThreadTree.nodes;
      const fcpTs = navigationFCP.event.ts;
      let tbt = 0;
      for (const rootId of mainThreadTree.roots) {
        const node = mainThreadNodes.get(rootId);
        if (node === void 0) {
          throw new Error(`Node not found for id: ${rootId}`);
        }
        if (mainThreadEvents[node.eventIndex] === void 0) {
          throw new Error(`Event not found for index: ${node.eventIndex}`);
        }
        const task = mainThreadEvents[node.eventIndex];
        if (task.name !== KnownEventName.RunTask || Types.TraceEvents.isTraceEventInstant(task)) {
          continue;
        }
        if (task.ts + task.dur < fcpTs) {
          continue;
        }
        const timeAfterFCP = task.ts < fcpTs ? fcpTs - task.ts : 0;
        const clippedTaskDuration = task.dur - timeAfterFCP;
        tbt += clippedTaskDuration > LONG_TASK_THRESHOLD ? clippedTaskDuration - LONG_TASK_THRESHOLD : 0;
      }
      const tbtValue = Types.Timing.MicroSeconds(tbt);
      const tbtScore = Helpers.Timing.formatMicrosecondsTime(tbtValue, {
        format: Types.Timing.TimeUnit.MILLISECONDS,
        maximumFractionDigits: 2
      });
      const tbtMetric = {
        score: tbtScore,
        estimated: true,
        metricName: MetricName.TBT,
        classification: scoreClassificationForTotalBlockingTime(tbtValue),
        navigation: navigationFCP.navigation
      };
      storeMetricScore(frameId, navigationId, tbtMetric);
    }
  }
}
export function getFirstFCPTimestampFromModelData(model) {
  const mainFrameID = model.Meta.mainFrameId;
  const metricsForMainFrameByNavigationID = model.PageLoadMetrics.metricScoresByFrameId.get(mainFrameID);
  if (!metricsForMainFrameByNavigationID) {
    return null;
  }
  let firstFCPEventInTimeline = null;
  for (const metrics of metricsForMainFrameByNavigationID.values()) {
    const fcpMetric = metrics.get(MetricName.FCP);
    const fcpTimestamp = fcpMetric?.event?.ts;
    if (fcpTimestamp) {
      if (!firstFCPEventInTimeline) {
        firstFCPEventInTimeline = fcpTimestamp;
      } else if (fcpTimestamp < firstFCPEventInTimeline) {
        firstFCPEventInTimeline = fcpTimestamp;
      }
    }
  }
  return firstFCPEventInTimeline;
}
export function scoreClassificationForFirstContentfulPaint(fcpScoreInMicroseconds) {
  const FCP_GOOD_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(1.8));
  const FCP_MEDIUM_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(3));
  let scoreClassification = ScoreClassification.BAD;
  if (fcpScoreInMicroseconds <= FCP_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (fcpScoreInMicroseconds <= FCP_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}
export function scoreClassificationForTimeToInteractive(ttiTimeInMicroseconds) {
  const TTI_GOOD_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(3.8));
  const TTI_MEDIUM_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(7.3));
  let scoreClassification = ScoreClassification.BAD;
  if (ttiTimeInMicroseconds <= TTI_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (ttiTimeInMicroseconds <= TTI_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}
export function scoreClassificationForLargestContentfulPaint(lcpTimeInMicroseconds) {
  const LCP_GOOD_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(2.5));
  const LCP_MEDIUM_TIMING = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(4));
  let scoreClassification = ScoreClassification.BAD;
  if (lcpTimeInMicroseconds <= LCP_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (lcpTimeInMicroseconds <= LCP_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}
export function scoreClassificationForDOMContentLoaded(_dclTimeInMicroseconds) {
  return ScoreClassification.UNCLASSIFIED;
}
export function scoreClassificationForTotalBlockingTime(tbtTimeInMicroseconds) {
  const TBT_GOOD_TIMING = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(200));
  const TBT_MEDIUM_TIMING = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(600));
  let scoreClassification = ScoreClassification.BAD;
  if (tbtTimeInMicroseconds <= TBT_MEDIUM_TIMING) {
    scoreClassification = ScoreClassification.OK;
  }
  if (tbtTimeInMicroseconds <= TBT_GOOD_TIMING) {
    scoreClassification = ScoreClassification.GOOD;
  }
  return scoreClassification;
}
export async function finalize() {
  pageLoadEventsArray.sort((a, b) => a.ts - b.ts);
  for (const pageLoadEvent of pageLoadEventsArray) {
    const navigation = getNavigationForPageLoadEvent(pageLoadEvent);
    if (navigation) {
      storePageLoadMetricAgainstNavigationId(navigation, pageLoadEvent);
    }
  }
  estimateTotalBlockingTimes();
  const lcpNodeIds = /* @__PURE__ */ new Set();
  for (const lcpEvent of selectedLCPCandidateEvents) {
    if (lcpEvent.args.data) {
      lcpNodeIds.add(lcpEvent.args.data.nodeId);
    }
  }
}
export function data() {
  return {
    metricScoresByFrameId: new Map(metricScoresByFrameId)
  };
}
export function deps() {
  return ["Meta", "Renderer"];
}
export var ScoreClassification = /* @__PURE__ */ ((ScoreClassification2) => {
  ScoreClassification2["GOOD"] = "good";
  ScoreClassification2["OK"] = "ok";
  ScoreClassification2["BAD"] = "bad";
  ScoreClassification2["UNCLASSIFIED"] = "unclassified";
  return ScoreClassification2;
})(ScoreClassification || {});
export var MetricName = /* @__PURE__ */ ((MetricName2) => {
  MetricName2["FCP"] = "FCP";
  MetricName2["LCP"] = "LCP";
  MetricName2["DCL"] = "DCL";
  MetricName2["TTI"] = "TTI";
  MetricName2["TBT"] = "TBT";
  MetricName2["CLS"] = "CLS";
  return MetricName2;
})(MetricName || {});
//# sourceMappingURL=PageLoadMetricsHandler.js.map
