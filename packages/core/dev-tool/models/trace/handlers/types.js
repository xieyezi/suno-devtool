export var HandlerState = /* @__PURE__ */ ((HandlerState2) => {
  HandlerState2[HandlerState2["UNINITIALIZED"] = 1] = "UNINITIALIZED";
  HandlerState2[HandlerState2["INITIALIZED"] = 2] = "INITIALIZED";
  HandlerState2[HandlerState2["FINALIZED"] = 3] = "FINALIZED";
  return HandlerState2;
})(HandlerState || {});
export var EventCategory = /* @__PURE__ */ ((EventCategory2) => {
  EventCategory2["Parse"] = "Parse";
  EventCategory2["V8"] = "V8";
  EventCategory2["Js"] = "Js";
  EventCategory2["Gc"] = "Gc";
  EventCategory2["Layout"] = "Layout";
  EventCategory2["Paint"] = "Paint";
  EventCategory2["Load"] = "Load";
  EventCategory2["Other"] = "Other";
  return EventCategory2;
})(EventCategory || {});
export var KnownEventName = /* @__PURE__ */ ((KnownEventName2) => {
  KnownEventName2["Program"] = "Program";
  KnownEventName2["RunTask"] = "RunTask";
  KnownEventName2["AsyncTask"] = "AsyncTask";
  KnownEventName2["XHRLoad"] = "XHRLoad";
  KnownEventName2["XHRReadyStateChange"] = "XHRReadyStateChange";
  KnownEventName2["ParseHTML"] = "ParseHTML";
  KnownEventName2["ParseCSS"] = "ParseAuthorStyleSheet";
  KnownEventName2["CompileScript"] = "V8.CompileScript";
  KnownEventName2["CompileCode"] = "V8.CompileCode";
  KnownEventName2["CompileModule"] = "V8.CompileModule";
  KnownEventName2["Optimize"] = "V8.OptimizeCode";
  KnownEventName2["WasmStreamFromResponseCallback"] = "v8.wasm.streamFromResponseCallback";
  KnownEventName2["WasmCompiledModule"] = "v8.wasm.compiledModule";
  KnownEventName2["WasmCachedModule"] = "v8.wasm.cachedModule";
  KnownEventName2["WasmModuleCacheHit"] = "v8.wasm.moduleCacheHit";
  KnownEventName2["WasmModuleCacheInvalid"] = "v8.wasm.moduleCacheInvalid";
  KnownEventName2["RunMicrotasks"] = "RunMicrotasks";
  KnownEventName2["EvaluateScript"] = "EvaluateScript";
  KnownEventName2["FunctionCall"] = "FunctionCall";
  KnownEventName2["EventDispatch"] = "EventDispatch";
  KnownEventName2["RequestMainThreadFrame"] = "RequestMainThreadFrame";
  KnownEventName2["RequestAnimationFrame"] = "RequestAnimationFrame";
  KnownEventName2["CancelAnimationFrame"] = "CancelAnimationFrame";
  KnownEventName2["FireAnimationFrame"] = "FireAnimationFrame";
  KnownEventName2["RequestIdleCallback"] = "RequestIdleCallback";
  KnownEventName2["CancelIdleCallback"] = "CancelIdleCallback";
  KnownEventName2["FireIdleCallback"] = "FireIdleCallback";
  KnownEventName2["TimerInstall"] = "TimerInstall";
  KnownEventName2["TimerRemove"] = "TimerRemove";
  KnownEventName2["TimerFire"] = "TimerFire";
  KnownEventName2["WebSocketCreate"] = "WebSocketCreate";
  KnownEventName2["WebSocketSendHandshake"] = "WebSocketSendHandshakeRequest";
  KnownEventName2["WebSocketReceiveHandshake"] = "WebSocketReceiveHandshakeResponse";
  KnownEventName2["WebSocketDestroy"] = "WebSocketDestroy";
  KnownEventName2["CryptoDoEncrypt"] = "DoEncrypt";
  KnownEventName2["CryptoDoEncryptReply"] = "DoEncryptReply";
  KnownEventName2["CryptoDoDecrypt"] = "DoDecrypt";
  KnownEventName2["CryptoDoDecryptReply"] = "DoDecryptReply";
  KnownEventName2["CryptoDoDigest"] = "DoDigest";
  KnownEventName2["CryptoDoDigestReply"] = "DoDigestReply";
  KnownEventName2["CryptoDoSign"] = "DoSign";
  KnownEventName2["CryptoDoSignReply"] = "DoSignReply";
  KnownEventName2["CryptoDoVerify"] = "DoVerify";
  KnownEventName2["CryptoDoVerifyReply"] = "DoVerifyReply";
  KnownEventName2["GC"] = "GCEvent";
  KnownEventName2["DOMGC"] = "BlinkGC.AtomicPhase";
  KnownEventName2["IncrementalGCMarking"] = "V8.GCIncrementalMarking";
  KnownEventName2["MajorGC"] = "MajorGC";
  KnownEventName2["MinorGC"] = "MinorGC";
  KnownEventName2["ScheduleStyleRecalculation"] = "ScheduleStyleRecalculation";
  KnownEventName2["RecalculateStyles"] = "RecalculateStyles";
  KnownEventName2["Layout"] = "Layout";
  KnownEventName2["UpdateLayoutTree"] = "UpdateLayoutTree";
  KnownEventName2["InvalidateLayout"] = "InvalidateLayout";
  KnownEventName2["LayoutInvalidationTracking"] = "LayoutInvalidationTracking";
  KnownEventName2["ComputeIntersections"] = "ComputeIntersections";
  KnownEventName2["HitTest"] = "HitTest";
  KnownEventName2["PrePaint"] = "PrePaint";
  KnownEventName2["ScrollLayer"] = "ScrollLayer";
  KnownEventName2["UpdateLayer"] = "UpdateLayer";
  KnownEventName2["PaintSetup"] = "PaintSetup";
  KnownEventName2["Paint"] = "Paint";
  KnownEventName2["PaintImage"] = "PaintImage";
  KnownEventName2["Commit"] = "Commit";
  KnownEventName2["CompositeLayers"] = "CompositeLayers";
  KnownEventName2["RasterTask"] = "RasterTask";
  KnownEventName2["ImageDecodeTask"] = "ImageDecodeTask";
  KnownEventName2["ImageUploadTask"] = "ImageUploadTask";
  KnownEventName2["DecodeImage"] = "Decode Image";
  KnownEventName2["ResizeImage"] = "Resize Image";
  KnownEventName2["DrawLazyPixelRef"] = "Draw LazyPixelRef";
  KnownEventName2["DecodeLazyPixelRef"] = "Decode LazyPixelRef";
  KnownEventName2["GPUTask"] = "GPUTask";
  return KnownEventName2;
})(KnownEventName || {});
export const KNOWN_EVENTS = /* @__PURE__ */ new Map([
  ["Program" /* Program */, { category: "Other" /* Other */, label: "Other" }],
  ["RunTask" /* RunTask */, { category: "Other" /* Other */, label: "Run Task" }],
  ["AsyncTask" /* AsyncTask */, { category: "Other" /* Other */, label: "Async Task" }],
  ["XHRLoad" /* XHRLoad */, { category: "Load" /* Load */, label: "Load" }],
  ["XHRReadyStateChange" /* XHRReadyStateChange */, { category: "Load" /* Load */, label: "ReadyStateChange" }],
  ["ParseHTML" /* ParseHTML */, { category: "Parse" /* Parse */, label: "Parse HTML" }],
  ["ParseAuthorStyleSheet" /* ParseCSS */, { category: "Parse" /* Parse */, label: "Parse StyleSheet" }],
  ["V8.CompileScript" /* CompileScript */, { category: "V8" /* V8 */, label: "Compile Script" }],
  ["V8.CompileCode" /* CompileCode */, { category: "V8" /* V8 */, label: "Compile Code" }],
  ["V8.CompileModule" /* CompileModule */, { category: "V8" /* V8 */, label: "Compile Module" }],
  ["V8.OptimizeCode" /* Optimize */, { category: "V8" /* V8 */, label: "Optimize" }],
  ["v8.wasm.streamFromResponseCallback" /* WasmStreamFromResponseCallback */, { category: "Js" /* Js */, label: "Streaming Wasm Response" }],
  ["v8.wasm.compiledModule" /* WasmCompiledModule */, { category: "Js" /* Js */, label: "Compiled Wasm Module" }],
  ["v8.wasm.cachedModule" /* WasmCachedModule */, { category: "Js" /* Js */, label: "Cached Wasm Module" }],
  ["v8.wasm.moduleCacheHit" /* WasmModuleCacheHit */, { category: "Js" /* Js */, label: "Wasm Module Cache Hit" }],
  ["v8.wasm.moduleCacheInvalid" /* WasmModuleCacheInvalid */, { category: "Js" /* Js */, label: "Wasm Module Cache Invalid" }],
  ["RunMicrotasks" /* RunMicrotasks */, { category: "Js" /* Js */, label: "Run Microtasks" }],
  ["EvaluateScript" /* EvaluateScript */, { category: "Js" /* Js */, label: "Evaluate Script" }],
  ["FunctionCall" /* FunctionCall */, { category: "Js" /* Js */, label: "Function Call" }],
  ["EventDispatch" /* EventDispatch */, { category: "Js" /* Js */, label: "Event" }],
  ["RequestMainThreadFrame" /* RequestMainThreadFrame */, { category: "Js" /* Js */, label: "Request Main Thread Frame" }],
  ["RequestAnimationFrame" /* RequestAnimationFrame */, { category: "Js" /* Js */, label: "Request Animation Frame" }],
  ["CancelAnimationFrame" /* CancelAnimationFrame */, { category: "Js" /* Js */, label: "Cancel Animation Frame" }],
  ["FireAnimationFrame" /* FireAnimationFrame */, { category: "Js" /* Js */, label: "Animation Frame" }],
  ["RequestIdleCallback" /* RequestIdleCallback */, { category: "Js" /* Js */, label: "Request Idle Callback" }],
  ["CancelIdleCallback" /* CancelIdleCallback */, { category: "Js" /* Js */, label: "Cancel Idle Callback" }],
  ["FireIdleCallback" /* FireIdleCallback */, { category: "Js" /* Js */, label: "Idle Callback" }],
  ["TimerInstall" /* TimerInstall */, { category: "Js" /* Js */, label: "Timer Installed" }],
  ["TimerRemove" /* TimerRemove */, { category: "Js" /* Js */, label: "Timer Removed" }],
  ["TimerFire" /* TimerFire */, { category: "Js" /* Js */, label: "Timer Fired" }],
  ["WebSocketCreate" /* WebSocketCreate */, { category: "Js" /* Js */, label: "Create WebSocket" }],
  ["WebSocketSendHandshakeRequest" /* WebSocketSendHandshake */, { category: "Js" /* Js */, label: "Send WebSocket Handshake" }],
  ["WebSocketReceiveHandshakeResponse" /* WebSocketReceiveHandshake */, { category: "Js" /* Js */, label: "Receive WebSocket Handshake" }],
  ["WebSocketDestroy" /* WebSocketDestroy */, { category: "Js" /* Js */, label: "Destroy WebSocket" }],
  ["DoEncrypt" /* CryptoDoEncrypt */, { category: "Js" /* Js */, label: "Crypto Encrypt" }],
  ["DoEncryptReply" /* CryptoDoEncryptReply */, { category: "Js" /* Js */, label: "Crypto Encrypt Reply" }],
  ["DoDecrypt" /* CryptoDoDecrypt */, { category: "Js" /* Js */, label: "Crypto Decrypt" }],
  ["DoDecryptReply" /* CryptoDoDecryptReply */, { category: "Js" /* Js */, label: "Crypto Decrypt Reply" }],
  ["DoDigest" /* CryptoDoDigest */, { category: "Js" /* Js */, label: "Crypto Digest" }],
  ["DoDigestReply" /* CryptoDoDigestReply */, { category: "Js" /* Js */, label: "Crypto Digest Reply" }],
  ["DoSign" /* CryptoDoSign */, { category: "Js" /* Js */, label: "Crypto Sign" }],
  ["DoSignReply" /* CryptoDoSignReply */, { category: "Js" /* Js */, label: "Crypto Sign Reply" }],
  ["DoVerify" /* CryptoDoVerify */, { category: "Js" /* Js */, label: "Crypto Verify" }],
  ["DoVerifyReply" /* CryptoDoVerifyReply */, { category: "Js" /* Js */, label: "Crypto Verify Reply" }],
  ["GCEvent" /* GC */, { category: "Gc" /* Gc */, label: "GC" }],
  ["BlinkGC.AtomicPhase" /* DOMGC */, { category: "Gc" /* Gc */, label: "DOM GC" }],
  ["V8.GCIncrementalMarking" /* IncrementalGCMarking */, { category: "Gc" /* Gc */, label: "Incremental GC" }],
  ["MajorGC" /* MajorGC */, { category: "Gc" /* Gc */, label: "Major GC" }],
  ["MinorGC" /* MinorGC */, { category: "Gc" /* Gc */, label: "Minor GC" }],
  ["ScheduleStyleRecalculation" /* ScheduleStyleRecalculation */, { category: "Layout" /* Layout */, label: "Schedule Recalculate Style" }],
  ["RecalculateStyles" /* RecalculateStyles */, { category: "Layout" /* Layout */, label: "Recalculate Style" }],
  ["Layout" /* Layout */, { category: "Layout" /* Layout */, label: "Layout" }],
  ["UpdateLayoutTree" /* UpdateLayoutTree */, { category: "Layout" /* Layout */, label: "Recalculate Style" }],
  ["InvalidateLayout" /* InvalidateLayout */, { category: "Layout" /* Layout */, label: "Invalidate Layout" }],
  ["LayoutInvalidationTracking" /* LayoutInvalidationTracking */, { category: "Layout" /* Layout */, label: "Layout Invalidation" }],
  ["ComputeIntersections" /* ComputeIntersections */, { category: "Paint" /* Paint */, label: "Compute Intersections" }],
  ["HitTest" /* HitTest */, { category: "Layout" /* Layout */, label: "Hit Test" }],
  ["PrePaint" /* PrePaint */, { category: "Layout" /* Layout */, label: "Pre-Paint" }],
  ["ScrollLayer" /* ScrollLayer */, { category: "Paint" /* Paint */, label: "Scroll" }],
  ["UpdateLayer" /* UpdateLayer */, { category: "Paint" /* Paint */, label: "Update Layer" }],
  ["PaintSetup" /* PaintSetup */, { category: "Paint" /* Paint */, label: "Paint Setup" }],
  ["Paint" /* Paint */, { category: "Paint" /* Paint */, label: "Paint" }],
  ["PaintImage" /* PaintImage */, { category: "Paint" /* Paint */, label: "Paint Image" }],
  ["Commit" /* Commit */, { category: "Paint" /* Paint */, label: "Commit" }],
  ["CompositeLayers" /* CompositeLayers */, { category: "Paint" /* Paint */, label: "Composite Layers" }],
  ["RasterTask" /* RasterTask */, { category: "Paint" /* Paint */, label: "Raster" }],
  ["ImageDecodeTask" /* ImageDecodeTask */, { category: "Paint" /* Paint */, label: "Decode Image Task" }],
  ["ImageUploadTask" /* ImageUploadTask */, { category: "Paint" /* Paint */, label: "Upload Image Task" }],
  ["Decode Image" /* DecodeImage */, { category: "Paint" /* Paint */, label: "Decode Image" }],
  ["Resize Image" /* ResizeImage */, { category: "Paint" /* Paint */, label: "Resize Image" }],
  ["Draw LazyPixelRef" /* DrawLazyPixelRef */, { category: "Paint" /* Paint */, label: "Draw LazyPixelRef" }],
  ["Decode LazyPixelRef" /* DecodeLazyPixelRef */, { category: "Paint" /* Paint */, label: "Decode LazyPixelRef" }],
  ["GPUTask" /* GPUTask */, { category: "Paint" /* Paint */, label: "GPU Task" }]
]);
//# sourceMappingURL=types.js.map
