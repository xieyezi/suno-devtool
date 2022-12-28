import * as Helpers from "../helpers/helpers.js";
import { HandlerState } from "./types.js";
import { ScoreClassification } from "./PageLoadMetricsHandler.js";
import { data as metaHandlerData } from "./MetaHandler.js";
import { data as screenshotsHandlerData } from "./ScreenshotsHandler.js";
import * as Platform from "../../../core/platform/platform.js";
import * as Types from "../types/types.js";
export const MAX_CLUSTER_DURATION = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(5e3));
export const MAX_SHIFT_TIME_DELTA = Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(1e3));
const layoutShiftEvents = [];
const layoutInvalidationEvents = [];
const styleRecalcInvalidationEvents = [];
const prePaintEvents = [];
let sessionMaxScore = 0;
let clsWindowID = -1;
const clusters = [];
const scoreRecords = [];
let handlerState = HandlerState.UNINITIALIZED;
export function initialize() {
  if (handlerState !== HandlerState.UNINITIALIZED) {
    throw new Error("LayoutShifts Handler was not reset");
  }
  handlerState = HandlerState.INITIALIZED;
}
export function reset() {
  handlerState = HandlerState.UNINITIALIZED;
  layoutShiftEvents.length = 0;
  layoutInvalidationEvents.length = 0;
  prePaintEvents.length = 0;
  clusters.length = 0;
  sessionMaxScore = 0;
  scoreRecords.length = 0;
  clsWindowID = -1;
}
export function handleEvent(event) {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error("Handler is not initialized");
  }
  if (Types.TraceEvents.isTraceEventLayoutShift(event) && !event.args.data?.had_recent_input) {
    layoutShiftEvents.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventLayoutInvalidation(event)) {
    layoutInvalidationEvents.push(event);
    return;
  }
  if (Types.TraceEvents.isTraceEventStyleRecalcInvalidation(event)) {
    styleRecalcInvalidationEvents.push(event);
  }
  if (Types.TraceEvents.isTraceEventPrePaint(event)) {
    prePaintEvents.push(event);
    return;
  }
}
function traceWindowFromTime(time) {
  return {
    min: time,
    max: time,
    range: Types.Timing.MicroSeconds(0)
  };
}
function updateTraceWindowMax(traceWindow, newMax) {
  traceWindow.max = newMax;
  traceWindow.range = Types.Timing.MicroSeconds(traceWindow.max - traceWindow.min);
}
function findNextScreenshot(timestamp) {
  const screenshots = screenshotsHandlerData();
  const screenshotIndex = findNextScreenshotEventIndex(screenshots, timestamp);
  if (!screenshotIndex) {
    return void 0;
  }
  const image = new Image();
  image.src = `data:img/png;base64,${screenshots[screenshotIndex].args.snapshot}`;
  return image;
}
export function findNextScreenshotEventIndex(screenshots, timestamp) {
  return Platform.ArrayUtilities.nearestIndexFromBeginning(screenshots, (frame) => frame.ts > timestamp);
}
function buildScoreRecords() {
  const { traceBounds } = metaHandlerData();
  scoreRecords.push({ ts: traceBounds.min, score: 0 });
  for (const cluster of clusters) {
    let clusterScore = 0;
    if (cluster.events[0].args.data) {
      scoreRecords.push({ ts: cluster.clusterWindow.min, score: cluster.events[0].args.data.weighted_score_delta });
    }
    for (let i = 0; i < cluster.events.length; i++) {
      const event = cluster.events[i];
      if (!event.args.data) {
        continue;
      }
      clusterScore += event.args.data.weighted_score_delta;
      scoreRecords.push({ ts: event.ts, score: clusterScore });
    }
    scoreRecords.push({ ts: cluster.clusterWindow.max, score: 0 });
  }
}
export async function finalize() {
  layoutShiftEvents.sort((a, b) => a.ts - b.ts);
  prePaintEvents.sort((a, b) => a.ts - b.ts);
  layoutInvalidationEvents.sort((a, b) => a.ts - b.ts);
  await buildLayoutShiftsClusters();
  buildScoreRecords();
  handlerState = HandlerState.FINALIZED;
}
async function buildLayoutShiftsClusters() {
  const { navigationsByFrameId, mainFrameId, traceBounds } = metaHandlerData();
  const navigations = navigationsByFrameId.get(mainFrameId) || [];
  if (layoutShiftEvents.length === 0) {
    return;
  }
  let firstShiftTime = layoutShiftEvents[0].ts;
  let lastShiftTime = layoutShiftEvents[0].ts;
  let lastShiftNavigation = null;
  for (const event of layoutShiftEvents) {
    const clusterDurationExceeded = event.ts - firstShiftTime > MAX_CLUSTER_DURATION;
    const maxTimeDeltaSinceLastShiftExceeded = event.ts - lastShiftTime > MAX_SHIFT_TIME_DELTA;
    const currentShiftNavigation = Platform.ArrayUtilities.nearestIndexFromEnd(navigations, (nav) => nav.ts < event.ts);
    const hasNavigated = lastShiftNavigation !== currentShiftNavigation && currentShiftNavigation !== null;
    if (clusterDurationExceeded || maxTimeDeltaSinceLastShiftExceeded || hasNavigated || !clusters.length) {
      const clusterStartTime = event.ts;
      const endTimeByMaxSessionDuration = clusterDurationExceeded ? firstShiftTime + MAX_CLUSTER_DURATION : Infinity;
      const endTimeByMaxShiftGap = maxTimeDeltaSinceLastShiftExceeded ? lastShiftTime + MAX_SHIFT_TIME_DELTA : Infinity;
      const endTimeByNavigation = hasNavigated ? navigations[currentShiftNavigation].ts : Infinity;
      const previousClusterEndTime = Math.min(endTimeByMaxSessionDuration, endTimeByMaxShiftGap, endTimeByNavigation);
      if (clusters.length > 0) {
        const currentCluster2 = clusters[clusters.length - 1];
        updateTraceWindowMax(currentCluster2.clusterWindow, Types.Timing.MicroSeconds(previousClusterEndTime));
      }
      clusters.push({
        events: [],
        clusterWindow: traceWindowFromTime(clusterStartTime),
        clusterCumulativeScore: 0,
        scoreWindows: {
          good: traceWindowFromTime(clusterStartTime),
          needsImprovement: null,
          bad: null
        }
      });
      firstShiftTime = clusterStartTime;
    }
    const currentCluster = clusters[clusters.length - 1];
    const timeFromNavigation = currentShiftNavigation !== null ? Types.Timing.MicroSeconds(event.ts - navigations[currentShiftNavigation].ts) : void 0;
    currentCluster.clusterCumulativeScore += event.args.data ? event.args.data.weighted_score_delta : 0;
    const shift = {
      ...event,
      screenshot: findNextScreenshot(event.ts),
      timeFromNavigation,
      cumulativeWeightedScoreInWindow: currentCluster.clusterCumulativeScore,
      sessionWindowData: { cumulativeWindowScore: 0, id: clusters.length }
    };
    currentCluster.events.push(shift);
    updateTraceWindowMax(currentCluster.clusterWindow, event.ts);
    lastShiftTime = event.ts;
    lastShiftNavigation = currentShiftNavigation;
  }
  for (const cluster of clusters) {
    let weightedScore = 0;
    let windowID = -1;
    if (cluster === clusters[clusters.length - 1]) {
      const clusterEndByMaxDuration = MAX_CLUSTER_DURATION + cluster.clusterWindow.min;
      const clusterEndByMaxGap = cluster.clusterWindow.max + MAX_SHIFT_TIME_DELTA;
      const nextNavigationIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(navigations, (nav) => nav.ts > cluster.clusterWindow.max);
      const nextNavigationTime = nextNavigationIndex ? navigations[nextNavigationIndex].ts : Infinity;
      const clusterEnd = Math.min(clusterEndByMaxDuration, clusterEndByMaxGap, traceBounds.max, nextNavigationTime);
      updateTraceWindowMax(cluster.clusterWindow, Types.Timing.MicroSeconds(clusterEnd));
    }
    for (const shift of cluster.events) {
      weightedScore += shift.args.data ? shift.args.data.weighted_score_delta : 0;
      windowID = shift.sessionWindowData.id;
      shift.sessionWindowData.cumulativeWindowScore = cluster.clusterCumulativeScore;
      if (weightedScore < LayoutShiftsThreshold.NEEDS_IMPROVEMENT) {
        updateTraceWindowMax(cluster.scoreWindows.good, shift.ts);
      } else if (weightedScore >= LayoutShiftsThreshold.NEEDS_IMPROVEMENT && weightedScore < LayoutShiftsThreshold.BAD) {
        if (!cluster.scoreWindows.needsImprovement) {
          updateTraceWindowMax(cluster.scoreWindows.good, Types.Timing.MicroSeconds(shift.ts - 1));
          cluster.scoreWindows.needsImprovement = traceWindowFromTime(shift.ts);
        }
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, shift.ts);
      } else if (weightedScore >= LayoutShiftsThreshold.BAD) {
        if (!cluster.scoreWindows.bad) {
          if (cluster.scoreWindows.needsImprovement) {
            updateTraceWindowMax(cluster.scoreWindows.needsImprovement, Types.Timing.MicroSeconds(shift.ts - 1));
          } else {
            updateTraceWindowMax(cluster.scoreWindows.good, Types.Timing.MicroSeconds(shift.ts - 1));
          }
          cluster.scoreWindows.bad = traceWindowFromTime(shift.ts);
        }
        updateTraceWindowMax(cluster.scoreWindows.bad, shift.ts);
      }
      if (cluster.scoreWindows.bad) {
        updateTraceWindowMax(cluster.scoreWindows.bad, cluster.clusterWindow.max);
      } else if (cluster.scoreWindows.needsImprovement) {
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, cluster.clusterWindow.max);
      } else {
        updateTraceWindowMax(cluster.scoreWindows.good, cluster.clusterWindow.max);
      }
    }
    if (weightedScore > sessionMaxScore) {
      clsWindowID = windowID;
      sessionMaxScore = weightedScore;
    }
  }
}
export function data() {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error("Layout Shifts Handler is not finalized");
  }
  return {
    clusters: [...clusters],
    sessionMaxScore,
    clsWindowID,
    prePaintEvents: [...prePaintEvents],
    layoutInvalidationEvents: [...layoutInvalidationEvents],
    styleRecalcInvalidationEvents: [],
    scoreRecords: [...scoreRecords]
  };
}
export function deps() {
  return ["Screenshots", "Meta"];
}
export function stateForLayoutShiftScore(score) {
  let state = ScoreClassification.GOOD;
  if (score >= LayoutShiftsThreshold.NEEDS_IMPROVEMENT) {
    state = ScoreClassification.OK;
  }
  if (score >= LayoutShiftsThreshold.BAD) {
    state = ScoreClassification.BAD;
  }
  return state;
}
export var LayoutShiftsThreshold = /* @__PURE__ */ ((LayoutShiftsThreshold2) => {
  LayoutShiftsThreshold2[LayoutShiftsThreshold2["GOOD"] = 0] = "GOOD";
  LayoutShiftsThreshold2[LayoutShiftsThreshold2["NEEDS_IMPROVEMENT"] = 0.1] = "NEEDS_IMPROVEMENT";
  LayoutShiftsThreshold2[LayoutShiftsThreshold2["BAD"] = 0.25] = "BAD";
  return LayoutShiftsThreshold2;
})(LayoutShiftsThreshold || {});
//# sourceMappingURL=LayoutShiftsHandler.js.map
