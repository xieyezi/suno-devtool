import * as Platform from "../../../core/platform/platform.js";
import * as Types from "../types/types.js";
export const millisecondsToMicroseconds = (value) => Types.Timing.MicroSeconds(value * 1e3);
export const secondsToMilliseconds = (value) => Types.Timing.MilliSeconds(value * 1e3);
export const secondsToMicroseconds = (value) => millisecondsToMicroseconds(secondsToMilliseconds(value));
export function detectBestTimeUnit(timeInMicroseconds) {
  if (timeInMicroseconds < 1e3) {
    return Types.Timing.TimeUnit.MICROSECONDS;
  }
  const timeInMilliseconds = timeInMicroseconds / 1e3;
  if (timeInMilliseconds < 1e3) {
    return Types.Timing.TimeUnit.MILLISECONDS;
  }
  const timeInSeconds = timeInMilliseconds / 1e3;
  if (timeInSeconds < 60) {
    return Types.Timing.TimeUnit.SECONDS;
  }
  return Types.Timing.TimeUnit.MINUTES;
}
const defaultFormatOptions = {
  style: "unit",
  unit: "millisecond",
  unitDisplay: "narrow"
};
const serialize = (value) => JSON.stringify(value);
const formatterFactory = (key) => {
  return new Intl.NumberFormat(navigator.language, key ? JSON.parse(key) : {});
};
const formatters = /* @__PURE__ */ new Map();
Platform.MapUtilities.getWithDefault(formatters, serialize({ style: "decimal" }), formatterFactory);
Platform.MapUtilities.getWithDefault(formatters, serialize(defaultFormatOptions), formatterFactory);
Platform.MapUtilities.getWithDefault(formatters, serialize({ ...defaultFormatOptions, unit: "second" }), formatterFactory);
Platform.MapUtilities.getWithDefault(formatters, serialize({ ...defaultFormatOptions, unit: "minute" }), formatterFactory);
export function formatMicrosecondsTime(timeInMicroseconds, opts = {}) {
  if (!opts.format) {
    opts.format = detectBestTimeUnit(timeInMicroseconds);
  }
  const timeInMilliseconds = timeInMicroseconds / 1e3;
  const timeInSeconds = timeInMilliseconds / 1e3;
  const formatterOpts = { ...defaultFormatOptions, ...opts };
  switch (opts.format) {
    case Types.Timing.TimeUnit.MICROSECONDS: {
      const formatter = Platform.MapUtilities.getWithDefault(formatters, serialize({ style: "decimal" }), formatterFactory);
      return `${formatter.format(timeInMicroseconds)}\u03BCs`;
    }
    case Types.Timing.TimeUnit.MILLISECONDS: {
      const formatter = Platform.MapUtilities.getWithDefault(formatters, serialize(formatterOpts), formatterFactory);
      return formatter.format(timeInMilliseconds);
    }
    case Types.Timing.TimeUnit.SECONDS: {
      const formatter = Platform.MapUtilities.getWithDefault(formatters, serialize({ ...formatterOpts, unit: "second" }), formatterFactory);
      return formatter.format(timeInSeconds);
    }
    default: {
      const minuteFormatter = Platform.MapUtilities.getWithDefault(formatters, serialize({ ...formatterOpts, unit: "minute" }), formatterFactory);
      const secondFormatter = Platform.MapUtilities.getWithDefault(formatters, serialize({ ...formatterOpts, unit: "second" }), formatterFactory);
      const timeInMinutes = timeInSeconds / 60;
      const [mins, divider, fraction] = minuteFormatter.formatToParts(timeInMinutes);
      let seconds = 0;
      if (divider && fraction) {
        seconds = Math.round(Number(`0.${fraction.value}`) * 60);
      }
      return `${minuteFormatter.format(Number(mins.value))} ${secondFormatter.format(seconds)}`;
    }
  }
}
//# sourceMappingURL=Timing.js.map
