class MicroSecondsTag {
  #microSecondsTag;
}
export function MicroSeconds(value) {
  return value;
}
class MilliSecondsTag {
  #milliSecondsTag;
}
export function MilliSeconds(value) {
  return value;
}
class SecondsTag {
  #secondsTag;
}
export function Seconds(value) {
  return value;
}
export var TimeUnit = /* @__PURE__ */ ((TimeUnit2) => {
  TimeUnit2[TimeUnit2["MICROSECONDS"] = 0] = "MICROSECONDS";
  TimeUnit2[TimeUnit2["MILLISECONDS"] = 1] = "MILLISECONDS";
  TimeUnit2[TimeUnit2["SECONDS"] = 2] = "SECONDS";
  TimeUnit2[TimeUnit2["MINUTES"] = 3] = "MINUTES";
  return TimeUnit2;
})(TimeUnit || {});
//# sourceMappingURL=Timing.js.map
