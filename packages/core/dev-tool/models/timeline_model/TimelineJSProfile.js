import * as i18n from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
import { RecordType, TimelineModelImpl } from "./TimelineModel.js";
const UIStrings = {
  threadS: "Thread {PH1}"
};
const str_ = i18n.i18n.registerUIStrings("models/timeline_model/TimelineJSProfile.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
export class TimelineJSProfileProcessor {
  static generateTracingEventsFromCpuProfile(jsProfileModel, thread) {
    const samples = jsProfileModel.samples || [];
    const timestamps = jsProfileModel.timestamps;
    const jsEvents = [];
    const nodeToStackMap = /* @__PURE__ */ new Map();
    let prevNode = jsProfileModel.root;
    for (let i = 0; i < samples.length; ++i) {
      let node = jsProfileModel.nodeByIndex(i);
      if (!node) {
        console.error(`Node with unknown id ${samples[i]} at index ${i}`);
        continue;
      }
      let callFrames = nodeToStackMap.get(node);
      if (!callFrames) {
        if (node === jsProfileModel.gcNode) {
          callFrames = new Array(2);
          callFrames[0] = node;
          callFrames[1] = prevNode;
          nodeToStackMap.set(node, callFrames);
        } else {
          callFrames = new Array(node.depth + 1);
          nodeToStackMap.set(node, callFrames);
          for (let j = 0; node.parent; node = node.parent) {
            callFrames[j++] = node;
          }
        }
      }
      const jsSampleEvent = new SDK.TracingModel.Event(SDK.TracingModel.DevToolsTimelineEventCategory, RecordType.JSSample, SDK.TracingModel.Phase.Instant, timestamps[i], thread);
      jsSampleEvent.args["data"] = { stackTrace: callFrames };
      jsEvents.push(jsSampleEvent);
      prevNode = node;
    }
    return jsEvents;
  }
  static generateJSFrameEvents(events, config) {
    function equalFrames(frame1, frame2) {
      return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName && frame1.lineNumber === frame2.lineNumber;
    }
    function isJSInvocationEvent(e) {
      switch (e.name) {
        case RecordType.RunMicrotasks:
        case RecordType.FunctionCall:
        case RecordType.EvaluateScript:
        case RecordType.EvaluateModule:
        case RecordType.EventDispatch:
        case RecordType.V8Execute:
          return true;
      }
      return false;
    }
    const jsFrameEvents = [];
    const jsFramesStack = [];
    const lockedJsStackDepth = [];
    let ordinal = 0;
    let fakeJSInvocation = false;
    const { showAllEvents, showRuntimeCallStats, showNativeFunctions } = config;
    function onStartEvent(e) {
      if (fakeJSInvocation) {
        truncateJSStack(lockedJsStackDepth.pop(), e.startTime);
        fakeJSInvocation = false;
      }
      e.ordinal = ++ordinal;
      extractStackTrace(e);
      lockedJsStackDepth.push(jsFramesStack.length);
    }
    function onInstantEvent(e, parent) {
      e.ordinal = ++ordinal;
      if (parent && isJSInvocationEvent(parent) || fakeJSInvocation) {
        extractStackTrace(e);
      } else if (e.name === RecordType.JSSample && jsFramesStack.length === 0) {
        fakeJSInvocation = true;
        const stackDepthBefore = jsFramesStack.length;
        extractStackTrace(e);
        lockedJsStackDepth.push(stackDepthBefore);
      }
    }
    function onEndEvent(e) {
      truncateJSStack(lockedJsStackDepth.pop(), e.endTime);
    }
    function truncateJSStack(depth, time) {
      if (lockedJsStackDepth.length) {
        const lockedDepth = lockedJsStackDepth[lockedJsStackDepth.length - 1];
        if (depth < lockedDepth) {
          console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);
          depth = lockedDepth;
        }
      }
      if (jsFramesStack.length < depth) {
        console.error(`Trying to truncate higher than the current stack size at ${time}`);
        depth = jsFramesStack.length;
      }
      for (let k = 0; k < jsFramesStack.length; ++k) {
        jsFramesStack[k].setEndTime(time);
      }
      jsFramesStack.length = depth;
    }
    function showNativeName(name) {
      return showRuntimeCallStats && Boolean(TimelineJSProfileProcessor.nativeGroup(name));
    }
    function filterStackFrames(stack) {
      if (showAllEvents) {
        return;
      }
      let previousNativeFrameName = null;
      let j = 0;
      for (let i = 0; i < stack.length; ++i) {
        const frame = stack[i];
        const url = frame.url;
        const isNativeFrame = url && url.startsWith("native ");
        if (!showNativeFunctions && isNativeFrame) {
          continue;
        }
        const isNativeRuntimeFrame = TimelineJSProfileProcessor.isNativeRuntimeFrame(frame);
        if (isNativeRuntimeFrame && !showNativeName(frame.functionName)) {
          continue;
        }
        const nativeFrameName = isNativeRuntimeFrame ? TimelineJSProfileProcessor.nativeGroup(frame.functionName) : null;
        if (previousNativeFrameName && previousNativeFrameName === nativeFrameName) {
          continue;
        }
        previousNativeFrameName = nativeFrameName;
        stack[j++] = frame;
      }
      stack.length = j;
    }
    function extractStackTrace(e) {
      const callFrames = e.name === RecordType.JSSample ? e.args["data"]["stackTrace"].slice().reverse() : jsFramesStack.map((frameEvent) => frameEvent.args["data"]);
      filterStackFrames(callFrames);
      const endTime = e.endTime || e.startTime;
      const minFrames = Math.min(callFrames.length, jsFramesStack.length);
      let i;
      for (i = lockedJsStackDepth[lockedJsStackDepth.length - 1] || 0; i < minFrames; ++i) {
        const newFrame = callFrames[i];
        const oldFrame = jsFramesStack[i].args["data"];
        if (!equalFrames(newFrame, oldFrame)) {
          break;
        }
        jsFramesStack[i].setEndTime(Math.max(jsFramesStack[i].endTime, endTime));
      }
      truncateJSStack(i, e.startTime);
      for (; i < callFrames.length; ++i) {
        const frame = callFrames[i];
        const jsFrameEvent = new SDK.TracingModel.Event(SDK.TracingModel.DevToolsTimelineEventCategory, RecordType.JSFrame, SDK.TracingModel.Phase.Complete, e.startTime, e.thread);
        jsFrameEvent.ordinal = e.ordinal;
        jsFrameEvent.addArgs({ data: frame });
        jsFrameEvent.setEndTime(endTime);
        jsFramesStack.push(jsFrameEvent);
        jsFrameEvents.push(jsFrameEvent);
      }
    }
    const firstTopLevelEvent = events.find(SDK.TracingModel.TracingModel.isTopLevelEvent);
    const startTime = firstTopLevelEvent ? firstTopLevelEvent.startTime : 0;
    TimelineModelImpl.forEachEvent(events, onStartEvent, onEndEvent, onInstantEvent, startTime);
    return jsFrameEvents;
  }
  static isNativeRuntimeFrame(frame) {
    return frame.url === "native V8Runtime";
  }
  static nativeGroup(nativeName) {
    if (nativeName.startsWith("Parse")) {
      return TimelineJSProfileProcessor.NativeGroups.Parse;
    }
    if (nativeName.startsWith("Compile") || nativeName.startsWith("Recompile")) {
      return TimelineJSProfileProcessor.NativeGroups.Compile;
    }
    return null;
  }
  static buildTraceProfileFromCpuProfile(profile, tid, injectPageEvent, name) {
    const events = [];
    if (injectPageEvent) {
      appendEvent("TracingStartedInPage", { data: { "sessionId": "1" } }, 0, 0, "M");
    }
    if (!name) {
      name = i18nString(UIStrings.threadS, { PH1: tid });
    }
    appendEvent(SDK.TracingModel.MetadataEvent.ThreadName, { name }, 0, 0, "M", "__metadata");
    if (!profile) {
      return events;
    }
    appendEvent("(root)", {}, profile.startTime, profile.endTime - profile.startTime, "X", "toplevel");
    appendEvent("CpuProfile", { data: { "cpuProfile": profile } }, profile.endTime, 0, "I");
    return events;
    function appendEvent(name2, args, ts, dur, ph, cat) {
      const event = { cat: cat || "disabled-by-default-devtools.timeline", name: name2, ph: ph || "X", pid: 1, tid, ts, args };
      if (dur) {
        event.dur = dur;
      }
      events.push(event);
      return event;
    }
  }
}
((TimelineJSProfileProcessor2) => {
  let NativeGroups;
  ((NativeGroups2) => {
    NativeGroups2["Compile"] = "Compile";
    NativeGroups2["Parse"] = "Parse";
  })(NativeGroups = TimelineJSProfileProcessor2.NativeGroups || (TimelineJSProfileProcessor2.NativeGroups = {}));
})(TimelineJSProfileProcessor || (TimelineJSProfileProcessor = {}));
//# sourceMappingURL=TimelineJSProfile.js.map
