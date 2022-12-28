import * as Platform from "../platform/platform.js";
import { ColorConverter } from "./ColorConverter.js";
import {
  blendColors,
  contrastRatioAPCA,
  desiredLuminanceAPCA,
  luminance,
  luminanceAPCA,
  rgbaToHsla,
  rgbaToHwba
} from "./ColorUtils.js";
function parseAngle(angleText) {
  const angle = angleText.replace(/(deg|g?rad|turn)$/, "");
  if (isNaN(angle) || angleText.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);
  if (angleText.includes("turn")) {
    return number * 360;
  }
  if (angleText.includes("grad")) {
    return number * 9 / 10;
  }
  if (angleText.includes("rad")) {
    return number * 180 / Math.PI;
  }
  return number;
}
export function getFormat(formatText) {
  switch (formatText) {
    case Format.Nickname:
      return Format.Nickname;
    case Format.HEX:
      return Format.HEX;
    case Format.ShortHEX:
      return Format.ShortHEX;
    case Format.HEXA:
      return Format.HEXA;
    case Format.ShortHEXA:
      return Format.ShortHEXA;
    case Format.RGB:
      return Format.RGB;
    case Format.RGBA:
      return Format.RGBA;
    case Format.HSL:
      return Format.HSL;
    case Format.HSLA:
      return Format.HSLA;
    case Format.HWB:
      return Format.HWB;
    case Format.HWBA:
      return Format.HWBA;
    case Format.LCH:
      return Format.LCH;
    case Format.OKLCH:
      return Format.OKLCH;
    case Format.LAB:
      return Format.LAB;
    case Format.OKLAB:
      return Format.OKLAB;
  }
  return getColorSpace(formatText);
}
function getColorSpace(colorSpaceText) {
  switch (colorSpaceText) {
    case Format.SRGB:
      return Format.SRGB;
    case Format.SRGB_LINEAR:
      return Format.SRGB_LINEAR;
    case Format.DISPLAY_P3:
      return Format.DISPLAY_P3;
    case Format.A98_RGB:
      return Format.A98_RGB;
    case Format.PROPHOTO_RGB:
      return Format.PROPHOTO_RGB;
    case Format.REC_2020:
      return Format.REC_2020;
    case Format.XYZ:
      return Format.XYZ;
    case Format.XYZ_D50:
      return Format.XYZ_D50;
    case Format.XYZ_D65:
      return Format.XYZ_D65;
  }
  return null;
}
function mapPercentToRange(percent, range) {
  const sign = Math.sign(percent);
  const absPercent = Math.abs(percent);
  const [outMin, outMax] = range;
  return sign * (absPercent * (outMax - outMin) / 100 + outMin);
}
function parseColorFunction(originalText, parametersText) {
  const parameters = parametersText.trim().split(/\s+/);
  const [colorSpaceText, ...remainingParams] = parameters;
  const colorSpace = getColorSpace(colorSpaceText);
  if (!colorSpace) {
    return null;
  }
  if (remainingParams.length === 0) {
    return new ColorFunction(colorSpace, [0, 0, 0, null], originalText);
  }
  const alphaSeparatorIndex = remainingParams.indexOf("/");
  const containsAlpha = alphaSeparatorIndex !== -1;
  if (containsAlpha && alphaSeparatorIndex !== remainingParams.length - 2) {
    return null;
  }
  if (containsAlpha) {
    remainingParams.splice(alphaSeparatorIndex, 1);
  }
  const maxLength = containsAlpha ? 4 : 3;
  if (remainingParams.length > maxLength) {
    return null;
  }
  const nonesReplacesParams = remainingParams.map((param) => param === "none" ? "0" : param);
  const values = nonesReplacesParams.map((param) => parsePercentOrNumber(param, [0, 1]));
  const containsNull = values.includes(null);
  if (containsNull) {
    return null;
  }
  let alphaValue = 1;
  if (containsAlpha) {
    alphaValue = values[values.length - 1];
    values.pop();
  }
  const rgbOrXyza = [
    values[0] ?? 0,
    values[1] ?? 0,
    values[2] ?? 0,
    alphaValue
  ];
  return new ColorFunction(colorSpace, rgbOrXyza, originalText);
}
export function parse(text) {
  const value = text.toLowerCase().replace(/\s+/g, "");
  const simple = /^(?:#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(\w+))$/i;
  let match = value.match(simple);
  if (match) {
    if (match[1]) {
      return Legacy.fromHex(match[1], text);
    }
    if (match[2]) {
      return Legacy.fromName(match[2], text);
    }
    return null;
  }
  match = text.toLowerCase().match(/^\s*(?:(rgba?)|(hsla?)|(hwba?)|(lch)|(oklch)|(lab)|(oklab)|(color))\((.*)\)\s*$/);
  if (match) {
    const isRgbaMatch = Boolean(match[1]);
    const isHslaMatch = Boolean(match[2]);
    const isHwbaMatch = Boolean(match[3]);
    const isLchMatch = Boolean(match[4]);
    const isOklchMatch = Boolean(match[5]);
    const isLabMatch = Boolean(match[6]);
    const isOklabMatch = Boolean(match[7]);
    const isColorMatch = Boolean(match[8]);
    const valuesText = match[9];
    if (isColorMatch) {
      return parseColorFunction(text, valuesText);
    }
    const isOldSyntax = isRgbaMatch || isHslaMatch || isHwbaMatch;
    const allowCommas = isRgbaMatch || isHslaMatch;
    const convertNoneToZero = !isOldSyntax;
    const values = splitColorFunctionParameters(valuesText, { allowCommas, convertNoneToZero });
    if (!values) {
      return null;
    }
    const spec = [values[0], values[1], values[2], values[3]];
    if (isRgbaMatch) {
      return Legacy.fromRGBAFunction(values[0], values[1], values[2], values[3], text);
    }
    if (isHslaMatch) {
      return Legacy.fromHSLA(values[0], values[1], values[2], values[3], text);
    }
    if (isHwbaMatch) {
      return Legacy.fromHWB(values[0], values[1], values[2], values[3], text);
    }
    if (isLchMatch) {
      return LCH.fromSpec(spec, text);
    }
    if (isOklchMatch) {
      return Oklch.fromSpec(spec, text);
    }
    if (isLabMatch) {
      return Lab.fromSpec(spec, text);
    }
    if (isOklabMatch) {
      return Oklab.fromSpec(spec, text);
    }
  }
  return null;
}
function splitColorFunctionParameters(content, { allowCommas, convertNoneToZero }) {
  const components = content.trim();
  let values = [];
  if (allowCommas) {
    values = components.split(/\s*,\s*/);
  }
  if (!allowCommas || values.length === 1) {
    values = components.split(/\s+/);
    if (values[3] === "/") {
      values.splice(3, 1);
      if (values.length !== 4) {
        return null;
      }
    } else if (values.length > 2 && values[2].indexOf("/") !== -1 || values.length > 3 && values[3].indexOf("/") !== -1) {
      const alpha = values.slice(2, 4).join("");
      values = values.slice(0, 2).concat(alpha.split(/\//)).concat(values.slice(4));
    } else if (values.length >= 4) {
      return null;
    }
  }
  if (values.length !== 3 && values.length !== 4 || values.indexOf("") > -1) {
    return null;
  }
  if (convertNoneToZero) {
    return values.map((value) => value === "none" ? "0" : value);
  }
  return values;
}
function clamp(value, { min, max }) {
  if (value === null) {
    return value;
  }
  if (min) {
    value = Math.max(value, min);
  }
  if (max) {
    value = Math.min(value, max);
  }
  return value;
}
function parsePercentage(value, range) {
  if (!value.endsWith("%")) {
    return null;
  }
  const percentage = parseFloat(value.substr(0, value.length - 1));
  return isNaN(percentage) ? null : mapPercentToRange(percentage, range);
}
function parseNumber(value) {
  const number = parseFloat(value);
  return isNaN(number) ? null : number;
}
function parseAlpha(value) {
  if (value === void 0) {
    return null;
  }
  return clamp(parsePercentage(value, [0, 1]) ?? parseNumber(value), { min: 0, max: 1 });
}
function parsePercentOrNumber(value, range = [0, 1]) {
  if (isNaN(value.replace("%", ""))) {
    return null;
  }
  const parsed = parseFloat(value);
  if (value.indexOf("%") !== -1) {
    if (value.indexOf("%") !== value.length - 1) {
      return null;
    }
    return mapPercentToRange(parsed, range);
  }
  return parsed;
}
function parseRgbNumeric(value) {
  const parsed = parsePercentOrNumber(value);
  if (parsed === null) {
    return null;
  }
  if (value.indexOf("%") !== -1) {
    return parsed;
  }
  return parsed / 255;
}
function parseHueNumeric(value) {
  const angle = value.replace(/(deg|g?rad|turn)$/, "");
  if (isNaN(angle) || value.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);
  if (value.indexOf("turn") !== -1) {
    return number % 1;
  }
  if (value.indexOf("grad") !== -1) {
    return number / 400 % 1;
  }
  if (value.indexOf("rad") !== -1) {
    return number / (2 * Math.PI) % 1;
  }
  return number / 360 % 1;
}
function parseSatLightNumeric(value) {
  if (value.indexOf("%") !== value.length - 1 || isNaN(value.replace("%", ""))) {
    return null;
  }
  const parsed = parseFloat(value);
  return Math.min(1, parsed / 100);
}
function parseAlphaNumeric(value) {
  return parsePercentOrNumber(value);
}
function hsva2hsla(hsva, out_hsla) {
  const h = hsva[0];
  let s = hsva[1];
  const v = hsva[2];
  const t = (2 - s) * v;
  if (v === 0 || s === 0) {
    s = 0;
  } else {
    s *= v / (t < 1 ? t : 2 - t);
  }
  out_hsla[0] = h;
  out_hsla[1] = s;
  out_hsla[2] = t / 2;
  out_hsla[3] = hsva[3];
}
export function hsl2rgb(hsl, out_rgb) {
  const h = hsl[0];
  let s = hsl[1];
  const l = hsl[2];
  function hue2rgb(p2, q2, h2) {
    if (h2 < 0) {
      h2 += 1;
    } else if (h2 > 1) {
      h2 -= 1;
    }
    if (h2 * 6 < 1) {
      return p2 + (q2 - p2) * h2 * 6;
    }
    if (h2 * 2 < 1) {
      return q2;
    }
    if (h2 * 3 < 2) {
      return p2 + (q2 - p2) * (2 / 3 - h2) * 6;
    }
    return p2;
  }
  if (s < 0) {
    s = 0;
  }
  let q;
  if (l <= 0.5) {
    q = l * (1 + s);
  } else {
    q = l + s - l * s;
  }
  const p = 2 * l - q;
  const tr = h + 1 / 3;
  const tg = h;
  const tb = h - 1 / 3;
  out_rgb[0] = hue2rgb(p, q, tr);
  out_rgb[1] = hue2rgb(p, q, tg);
  out_rgb[2] = hue2rgb(p, q, tb);
  out_rgb[3] = hsl[3];
}
function hwb2rgb(hwb, out_rgb) {
  const h = hwb[0];
  const w = hwb[1];
  const b = hwb[2];
  if (w + b >= 1) {
    out_rgb[0] = out_rgb[1] = out_rgb[2] = w / (w + b);
    out_rgb[3] = hwb[3];
  } else {
    hsl2rgb([h, 1, 0.5, hwb[3]], out_rgb);
    for (let i = 0; i < 3; ++i) {
      out_rgb[i] += w - (w + b) * out_rgb[i];
    }
  }
}
export function hsva2rgba(hsva, out_rgba) {
  const tmpHSLA = [0, 0, 0, 0];
  hsva2hsla(hsva, tmpHSLA);
  hsl2rgb(tmpHSLA, out_rgba);
}
export function desiredLuminance(luminance2, contrast, lighter) {
  function computeLuminance() {
    if (lighter) {
      return (luminance2 + 0.05) * contrast - 0.05;
    }
    return (luminance2 + 0.05) / contrast - 0.05;
  }
  let desiredLuminance2 = computeLuminance();
  if (desiredLuminance2 < 0 || desiredLuminance2 > 1) {
    lighter = !lighter;
    desiredLuminance2 = computeLuminance();
  }
  return desiredLuminance2;
}
export function approachColorValue(candidateHSVA, bgRGBA, index, desiredLuminance2, candidateLuminance) {
  const epsilon = 2e-4;
  let x = candidateHSVA[index];
  let multiplier = 1;
  let dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance2;
  let previousSign = Math.sign(dLuminance);
  for (let guard = 100; guard; guard--) {
    if (Math.abs(dLuminance) < epsilon) {
      candidateHSVA[index] = x;
      return x;
    }
    const sign = Math.sign(dLuminance);
    if (sign !== previousSign) {
      multiplier /= 2;
      previousSign = sign;
    } else if (x < 0 || x > 1) {
      return null;
    }
    x += multiplier * (index === 2 ? -dLuminance : dLuminance);
    candidateHSVA[index] = x;
    dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance2;
  }
  return null;
}
export function findFgColorForContrast(fgColor, bgColor, requiredContrast) {
  const candidateHSVA = fgColor.hsva();
  const bgRGBA = bgColor.rgba();
  const candidateLuminance = (candidateHSVA2) => {
    return luminance(blendColors(Legacy.fromHSVA(candidateHSVA2).rgba(), bgRGBA));
  };
  const bgLuminance = luminance(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance > bgLuminance;
  const desired = desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);
  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;
  if (approachColorValue(candidateHSVA, bgRGBA, valueComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }
  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, bgRGBA, saturationComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }
  return null;
}
export function findFgColorForContrastAPCA(fgColor, bgColor, requiredContrast) {
  const candidateHSVA = fgColor.hsva();
  const bgRGBA = bgColor.rgba();
  const candidateLuminance = (candidateHSVA2) => {
    return luminanceAPCA(Legacy.fromHSVA(candidateHSVA2).rgba());
  };
  const bgLuminance = luminanceAPCA(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance >= bgLuminance;
  const desiredLuminance2 = desiredLuminanceAPCA(bgLuminance, requiredContrast, fgIsLighter);
  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;
  if (approachColorValue(candidateHSVA, bgRGBA, valueComponentIndex, desiredLuminance2, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }
  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, bgRGBA, saturationComponentIndex, desiredLuminance2, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }
  return null;
}
function stringifyWithPrecision(s, precision = 2) {
  const string = s.toFixed(precision).replace(/\.?0*$/, "");
  return string === "-0" ? "0" : string;
}
export class Lab {
  #l;
  #a;
  #b;
  #alpha;
  #origin;
  #originalText;
  #conversions = {
    [Format.Nickname]: () => new Legacy(this.#getRGBArray(false), Format.Nickname, void 0, this),
    [Format.HEX]: () => new Legacy(this.#getRGBArray(false), Format.HEX, void 0, this),
    [Format.ShortHEX]: () => new Legacy(this.#getRGBArray(false), Format.ShortHEX, void 0, this),
    [Format.HEXA]: () => new Legacy(this.#getRGBArray(true), Format.HEXA, void 0, this),
    [Format.ShortHEXA]: () => new Legacy(this.#getRGBArray(true), Format.ShortHEXA, void 0, this),
    [Format.RGB]: () => new Legacy(this.#getRGBArray(false), Format.RGB, void 0, this),
    [Format.RGBA]: () => new Legacy(this.#getRGBArray(true), Format.RGBA, void 0, this),
    [Format.HSL]: () => new Legacy(this.#getRGBArray(false), Format.HSL, void 0, this),
    [Format.HSLA]: () => new Legacy(this.#getRGBArray(true), Format.HSLA, void 0, this),
    [Format.HWB]: () => new Legacy(this.#getRGBArray(false), Format.HWB, void 0, this),
    [Format.HWBA]: () => new Legacy(this.#getRGBArray(true), Format.HWBA, void 0, this),
    [Format.LCH]: () => new LCH(...ColorConverter.labToLch(this.#l, this.#a, this.#b), this.#alpha, void 0, this),
    [Format.OKLCH]: () => new Oklch(...ColorConverter.xyzd50ToOklch(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.LAB]: () => this,
    [Format.OKLAB]: () => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.SRGB]: () => new ColorFunction(Format.SRGB, [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.SRGB_LINEAR]: () => new ColorFunction(Format.SRGB_LINEAR, [...ColorConverter.xyzd50TosRGBLinear(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.DISPLAY_P3]: () => new ColorFunction(Format.DISPLAY_P3, [...ColorConverter.xyzd50ToDisplayP3(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.A98_RGB]: () => new ColorFunction(Format.A98_RGB, [...ColorConverter.xyzd50ToAdobeRGB(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.PROPHOTO_RGB]: () => new ColorFunction(Format.PROPHOTO_RGB, [...ColorConverter.xyzd50ToProPhoto(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.REC_2020]: () => new ColorFunction(Format.REC_2020, [...ColorConverter.xyzd50ToRec2020(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ]: () => new ColorFunction(Format.XYZ, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ_D50]: () => new ColorFunction(Format.XYZ_D50, [...this.#toXyzd50(), this.#alpha], void 0, this),
    [Format.XYZ_D65]: () => new ColorFunction(Format.XYZ_D65, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this)
  };
  #toXyzd50() {
    return ColorConverter.labToXyzd50(this.#l, this.#a, this.#b);
  }
  #getRGBArray(withAlpha = true) {
    const params = [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (this.#alpha !== null && withAlpha) {
      params.push(this.#alpha);
    }
    return params;
  }
  constructor(l, a, b, alpha, originalText, origin) {
    this.#l = clamp(l, { min: 0, max: 100 });
    this.#a = a;
    this.#b = b;
    this.#alpha = clamp(alpha, { min: 0, max: 1 });
    this.#origin = origin;
    this.#originalText = originalText;
  }
  as(format) {
    if (this.#origin) {
      return this.#origin.as(format);
    }
    return this.#conversions[format]();
  }
  asLegacyColor() {
    return this.as(Format.RGBA);
  }
  equal(color) {
    const lab = color.as(Format.LAB);
    return lab.#l === this.#l && lab.#a === this.#a && lab.#b === this.#b && lab.#alpha === this.#alpha;
  }
  format() {
    return Format.LAB;
  }
  setAlpha(alpha) {
    return new Lab(this.#l, this.#a, this.#b, alpha, void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    if (this.#originalText) {
      return this.#originalText;
    }
    const alpha = this.#alpha === null || this.#alpha === 1 ? "" : ` / ${stringifyWithPrecision(this.#alpha)}`;
    return `lab(${stringifyWithPrecision(this.#l)} ${stringifyWithPrecision(this.#a)} ${stringifyWithPrecision(this.#b)}${alpha})`;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 125]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[2], [0, 125]) ?? parseNumber(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new Lab(L, a, b, alpha, text);
  }
}
export class LCH {
  #l;
  #c;
  #h;
  #alpha;
  #origin;
  #originalText;
  #conversions = {
    [Format.Nickname]: () => new Legacy(this.#getRGBArray(false), Format.Nickname, void 0, this),
    [Format.HEX]: () => new Legacy(this.#getRGBArray(false), Format.HEX, void 0, this),
    [Format.ShortHEX]: () => new Legacy(this.#getRGBArray(false), Format.ShortHEX, void 0, this),
    [Format.HEXA]: () => new Legacy(this.#getRGBArray(true), Format.HEXA, void 0, this),
    [Format.ShortHEXA]: () => new Legacy(this.#getRGBArray(true), Format.ShortHEXA, void 0, this),
    [Format.RGB]: () => new Legacy(this.#getRGBArray(false), Format.RGB, void 0, this),
    [Format.RGBA]: () => new Legacy(this.#getRGBArray(true), Format.RGBA, void 0, this),
    [Format.HSL]: () => new Legacy(this.#getRGBArray(false), Format.HSL, void 0, this),
    [Format.HSLA]: () => new Legacy(this.#getRGBArray(true), Format.HSLA, void 0, this),
    [Format.HWB]: () => new Legacy(this.#getRGBArray(false), Format.HWB, void 0, this),
    [Format.HWBA]: () => new Legacy(this.#getRGBArray(true), Format.HWBA, void 0, this),
    [Format.LCH]: () => this,
    [Format.OKLCH]: () => new Oklch(...ColorConverter.xyzd50ToOklch(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.LAB]: () => new Lab(...ColorConverter.lchToLab(this.#l, this.#c, this.#h), this.#alpha, void 0, this),
    [Format.OKLAB]: () => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.SRGB]: () => new ColorFunction(Format.SRGB, [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.SRGB_LINEAR]: () => new ColorFunction(Format.SRGB_LINEAR, [...ColorConverter.xyzd50TosRGBLinear(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.DISPLAY_P3]: () => new ColorFunction(Format.DISPLAY_P3, [...ColorConverter.xyzd50ToDisplayP3(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.A98_RGB]: () => new ColorFunction(Format.A98_RGB, [...ColorConverter.xyzd50ToAdobeRGB(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.PROPHOTO_RGB]: () => new ColorFunction(Format.PROPHOTO_RGB, [...ColorConverter.xyzd50ToProPhoto(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.REC_2020]: () => new ColorFunction(Format.REC_2020, [...ColorConverter.xyzd50ToRec2020(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ]: () => new ColorFunction(Format.XYZ, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ_D50]: () => new ColorFunction(Format.XYZ_D50, [...this.#toXyzd50(), this.#alpha], void 0, this),
    [Format.XYZ_D65]: () => new ColorFunction(Format.XYZ_D65, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this)
  };
  #toXyzd50() {
    return ColorConverter.labToXyzd50(...ColorConverter.lchToLab(this.#l, this.#c, this.#h));
  }
  #getRGBArray(withAlpha = true) {
    const params = [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (this.#alpha !== null && withAlpha) {
      params.push(this.#alpha);
    }
    return params;
  }
  constructor(l, c, h, alpha, originalText, origin) {
    this.#l = clamp(l, { min: 0, max: 100 });
    this.#c = clamp(c, { min: 0 });
    this.#h = h;
    this.#alpha = clamp(alpha, { min: 0, max: 1 });
    this.#origin = origin;
    this.#originalText = originalText;
  }
  asLegacyColor() {
    return this.as(Format.RGBA);
  }
  as(format) {
    if (this.#origin) {
      return this.#origin.as(format);
    }
    return this.#conversions[format]();
  }
  equal(color) {
    const lch = color.as(Format.LCH);
    return lch.#l === this.#l && lch.#c === this.#c && lch.#h === this.#h && lch.#alpha === this.#alpha;
  }
  format() {
    return Format.LCH;
  }
  setAlpha(alpha) {
    return new LCH(this.#l, this.#c, this.#h, alpha, void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    if (this.#originalText) {
      return this.#originalText;
    }
    const alpha = this.#alpha === null || this.#alpha === 1 ? "" : ` / ${stringifyWithPrecision(this.#alpha)}`;
    return `lch(${stringifyWithPrecision(this.#l)} ${stringifyWithPrecision(this.#c)} ${stringifyWithPrecision(this.#h)}${alpha})`;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const c = parsePercentage(spec[1], [0, 150]) ?? parseNumber(spec[1]);
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new LCH(L, c, h, alpha, text);
  }
}
export class Oklab {
  #l;
  #a;
  #b;
  #alpha;
  #origin;
  #originalText;
  #conversions = {
    [Format.Nickname]: () => new Legacy(this.#getRGBArray(false), Format.Nickname, void 0, this),
    [Format.HEX]: () => new Legacy(this.#getRGBArray(false), Format.HEX, void 0, this),
    [Format.ShortHEX]: () => new Legacy(this.#getRGBArray(false), Format.ShortHEX, void 0, this),
    [Format.HEXA]: () => new Legacy(this.#getRGBArray(true), Format.HEXA, void 0, this),
    [Format.ShortHEXA]: () => new Legacy(this.#getRGBArray(true), Format.ShortHEXA, void 0, this),
    [Format.RGB]: () => new Legacy(this.#getRGBArray(false), Format.RGB, void 0, this),
    [Format.RGBA]: () => new Legacy(this.#getRGBArray(true), Format.RGBA, void 0, this),
    [Format.HSL]: () => new Legacy(this.#getRGBArray(false), Format.HSL, void 0, this),
    [Format.HSLA]: () => new Legacy(this.#getRGBArray(true), Format.HSLA, void 0, this),
    [Format.HWB]: () => new Legacy(this.#getRGBArray(false), Format.HWB, void 0, this),
    [Format.HWBA]: () => new Legacy(this.#getRGBArray(true), Format.HWBA, void 0, this),
    [Format.LCH]: () => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.OKLCH]: () => new Oklch(...ColorConverter.xyzd50ToOklch(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.LAB]: () => new Lab(...ColorConverter.xyzd50ToLab(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.OKLAB]: () => this,
    [Format.SRGB]: () => new ColorFunction(Format.SRGB, [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.SRGB_LINEAR]: () => new ColorFunction(Format.SRGB_LINEAR, [...ColorConverter.xyzd50TosRGBLinear(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.DISPLAY_P3]: () => new ColorFunction(Format.DISPLAY_P3, [...ColorConverter.xyzd50ToDisplayP3(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.A98_RGB]: () => new ColorFunction(Format.A98_RGB, [...ColorConverter.xyzd50ToAdobeRGB(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.PROPHOTO_RGB]: () => new ColorFunction(Format.PROPHOTO_RGB, [...ColorConverter.xyzd50ToProPhoto(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.REC_2020]: () => new ColorFunction(Format.REC_2020, [...ColorConverter.xyzd50ToRec2020(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ]: () => new ColorFunction(Format.XYZ, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ_D50]: () => new ColorFunction(Format.XYZ_D50, [...this.#toXyzd50(), this.#alpha], void 0, this),
    [Format.XYZ_D65]: () => new ColorFunction(Format.XYZ_D65, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this)
  };
  #toXyzd50() {
    return ColorConverter.xyzd65ToD50(...ColorConverter.oklabToXyzd65(this.#l, this.#a, this.#b));
  }
  #getRGBArray(withAlpha = true) {
    const params = [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (this.#alpha !== null && withAlpha) {
      params.push(this.#alpha);
    }
    return params;
  }
  constructor(l, a, b, alpha, originalText, origin) {
    this.#l = clamp(l, { min: 0, max: 1 });
    this.#a = a;
    this.#b = b;
    this.#alpha = clamp(alpha, { min: 0, max: 1 });
    this.#origin = origin;
    this.#originalText = originalText;
  }
  asLegacyColor() {
    return this.as(Format.RGBA);
  }
  as(format) {
    if (this.#origin) {
      return this.#origin.as(format);
    }
    return this.#conversions[format]();
  }
  equal(color) {
    const oklab = color.as(Format.OKLAB);
    return oklab.#l === this.#l && oklab.#a === this.#a && oklab.#b === this.#b && oklab.#alpha === this.#alpha;
  }
  format() {
    return Format.OKLAB;
  }
  setAlpha(alpha) {
    return new Oklab(this.#l, this.#a, this.#b, alpha, void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    if (this.#originalText) {
      return this.#originalText;
    }
    const alpha = this.#alpha === null || this.#alpha === 1 ? "" : ` / ${stringifyWithPrecision(this.#alpha)}`;
    return `oklab(${stringifyWithPrecision(this.#l)} ${stringifyWithPrecision(this.#a)} ${stringifyWithPrecision(this.#b)}${alpha})`;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[2], [0, 0.4]) ?? parseNumber(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new Oklab(L, a, b, alpha, text);
  }
}
export class Oklch {
  #l;
  #c;
  #h;
  #alpha;
  #origin;
  #originalText;
  #conversions = {
    [Format.Nickname]: () => new Legacy(this.#getRGBArray(false), Format.Nickname, void 0, this),
    [Format.HEX]: () => new Legacy(this.#getRGBArray(false), Format.HEX, void 0, this),
    [Format.ShortHEX]: () => new Legacy(this.#getRGBArray(false), Format.ShortHEX, void 0, this),
    [Format.HEXA]: () => new Legacy(this.#getRGBArray(true), Format.HEXA, void 0, this),
    [Format.ShortHEXA]: () => new Legacy(this.#getRGBArray(true), Format.ShortHEXA, void 0, this),
    [Format.RGB]: () => new Legacy(this.#getRGBArray(false), Format.RGB, void 0, this),
    [Format.RGBA]: () => new Legacy(this.#getRGBArray(true), Format.RGBA, void 0, this),
    [Format.HSL]: () => new Legacy(this.#getRGBArray(false), Format.HSL, void 0, this),
    [Format.HSLA]: () => new Legacy(this.#getRGBArray(true), Format.HSLA, void 0, this),
    [Format.HWB]: () => new Legacy(this.#getRGBArray(false), Format.HWB, void 0, this),
    [Format.HWBA]: () => new Legacy(this.#getRGBArray(true), Format.HWBA, void 0, this),
    [Format.LCH]: () => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.OKLCH]: () => this,
    [Format.LAB]: () => new Lab(...ColorConverter.xyzd50ToLab(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.OKLAB]: () => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.SRGB]: () => new ColorFunction(Format.SRGB, [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.SRGB_LINEAR]: () => new ColorFunction(Format.SRGB_LINEAR, [...ColorConverter.xyzd50TosRGBLinear(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.DISPLAY_P3]: () => new ColorFunction(Format.DISPLAY_P3, [...ColorConverter.xyzd50ToDisplayP3(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.A98_RGB]: () => new ColorFunction(Format.A98_RGB, [...ColorConverter.xyzd50ToAdobeRGB(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.PROPHOTO_RGB]: () => new ColorFunction(Format.PROPHOTO_RGB, [...ColorConverter.xyzd50ToProPhoto(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.REC_2020]: () => new ColorFunction(Format.REC_2020, [...ColorConverter.xyzd50ToRec2020(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ]: () => new ColorFunction(Format.XYZ, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ_D50]: () => new ColorFunction(Format.XYZ_D50, [...this.#toXyzd50(), this.#alpha], void 0, this),
    [Format.XYZ_D65]: () => new ColorFunction(Format.XYZ_D65, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this)
  };
  #toXyzd50() {
    return ColorConverter.oklchToXyzd50(this.#l, this.#c, this.#h);
  }
  #getRGBArray(withAlpha = true) {
    const params = [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (this.#alpha !== null && withAlpha) {
      params.push(this.#alpha);
    }
    return params;
  }
  constructor(l, c, h, alpha, originalText, origin) {
    this.#l = clamp(l, { min: 0, max: 1 });
    this.#c = clamp(c, { min: 0 });
    this.#h = h;
    this.#alpha = clamp(alpha, { min: 0, max: 1 });
    this.#origin = origin;
    this.#originalText = originalText;
  }
  asLegacyColor() {
    return this.as(Format.RGBA);
  }
  as(format) {
    if (this.#origin) {
      return this.#origin.as(format);
    }
    return this.#conversions[format]();
  }
  equal(color) {
    const oklch = color.as(Format.OKLCH);
    return oklch.#l === this.#l && oklch.#c === this.#c && oklch.#h === this.#h && oklch.#alpha === this.#alpha;
  }
  format() {
    return Format.OKLCH;
  }
  setAlpha(alpha) {
    return new Oklch(this.#l, this.#c, this.#h, alpha, void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    if (this.#originalText) {
      return this.#originalText;
    }
    const alpha = this.#alpha === null || this.#alpha === 1 ? "" : ` / ${stringifyWithPrecision(this.#alpha)}`;
    return `oklch(${stringifyWithPrecision(this.#l)} ${stringifyWithPrecision(this.#c)} ${stringifyWithPrecision(this.#h)}${alpha})`;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const c = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new Oklch(L, c, h, alpha, text);
  }
}
export class ColorFunction {
  #spec;
  #colorSpace;
  #origin;
  #originalText;
  #conversions = {
    [Format.Nickname]: () => new Legacy(this.#getRGBArray(false), Format.Nickname, void 0, this),
    [Format.HEX]: () => new Legacy(this.#getRGBArray(false), Format.HEX, void 0, this),
    [Format.ShortHEX]: () => new Legacy(this.#getRGBArray(false), Format.ShortHEX, void 0, this),
    [Format.HEXA]: () => new Legacy(this.#getRGBArray(true), Format.HEXA, void 0, this),
    [Format.ShortHEXA]: () => new Legacy(this.#getRGBArray(true), Format.ShortHEXA, void 0, this),
    [Format.RGB]: () => new Legacy(this.#getRGBArray(false), Format.RGB, void 0, this),
    [Format.RGBA]: () => new Legacy(this.#getRGBArray(true), Format.RGBA, void 0, this),
    [Format.HSL]: () => new Legacy(this.#getRGBArray(false), Format.HSL, void 0, this),
    [Format.HSLA]: () => new Legacy(this.#getRGBArray(true), Format.HSLA, void 0, this),
    [Format.HWB]: () => new Legacy(this.#getRGBArray(false), Format.HWB, void 0, this),
    [Format.HWBA]: () => new Legacy(this.#getRGBArray(true), Format.HWBA, void 0, this),
    [Format.LCH]: () => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.OKLCH]: () => new Oklch(...ColorConverter.xyzd50ToOklch(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.LAB]: () => new Lab(...ColorConverter.xyzd50ToLab(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.OKLAB]: () => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.SRGB]: () => new ColorFunction(Format.SRGB, [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.SRGB_LINEAR]: () => new ColorFunction(Format.SRGB_LINEAR, [...ColorConverter.xyzd50TosRGBLinear(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.DISPLAY_P3]: () => new ColorFunction(Format.DISPLAY_P3, [...ColorConverter.xyzd50ToDisplayP3(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.A98_RGB]: () => new ColorFunction(Format.A98_RGB, [...ColorConverter.xyzd50ToAdobeRGB(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.PROPHOTO_RGB]: () => new ColorFunction(Format.PROPHOTO_RGB, [...ColorConverter.xyzd50ToProPhoto(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.REC_2020]: () => new ColorFunction(Format.REC_2020, [...ColorConverter.xyzd50ToRec2020(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ]: () => new ColorFunction(Format.XYZ, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ_D50]: () => new ColorFunction(Format.XYZ_D50, [...this.#toXyzd50(), this.#alpha], void 0, this),
    [Format.XYZ_D65]: () => new ColorFunction(Format.XYZ_D65, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this)
  };
  get #alpha() {
    return this.#spec[3] ?? null;
  }
  #toXyzd50() {
    const [p0, p1, p2] = this.#spec;
    switch (this.#colorSpace) {
      case Format.SRGB:
        return ColorConverter.srgbToXyzd50(p0, p1, p2);
      case Format.SRGB_LINEAR:
        return ColorConverter.srgbLinearToXyzd50(p0, p1, p2);
      case Format.DISPLAY_P3:
        return ColorConverter.displayP3ToXyzd50(p0, p1, p2);
      case Format.A98_RGB:
        return ColorConverter.adobeRGBToXyzd50(p0, p1, p2);
      case Format.PROPHOTO_RGB:
        return ColorConverter.proPhotoToXyzd50(p0, p1, p2);
      case Format.REC_2020:
        return ColorConverter.rec2020ToXyzd50(p0, p1, p2);
      case Format.XYZ_D50:
        return [p0, p1, p2];
      case Format.XYZ:
      case Format.XYZ_D65:
        return ColorConverter.xyzd65ToD50(p0, p1, p2);
    }
    throw new Error("Invalid color space");
  }
  #getRGBArray(withAlpha = true) {
    const [p0, p1, p2] = this.#spec;
    const params = this.#colorSpace === Format.SRGB ? [p0, p1, p2] : [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (this.#alpha !== null && withAlpha) {
      params.push(this.#alpha);
    }
    return params;
  }
  constructor(colorSpace, rgbOrXyz, originalText, origin) {
    this.#colorSpace = colorSpace;
    this.#origin = origin;
    this.#originalText = originalText;
    if (colorSpace === Format.XYZ || colorSpace === Format.XYZ_D50 || colorSpace === Format.XYZ_D65) {
      this.#spec = [rgbOrXyz[0], rgbOrXyz[1], rgbOrXyz[2], clamp(rgbOrXyz[3], { min: 0, max: 1 })];
    } else {
      this.#spec = [
        clamp(rgbOrXyz[0], { min: 0, max: 1 }),
        clamp(rgbOrXyz[1], { min: 0, max: 1 }),
        clamp(rgbOrXyz[2], { min: 0, max: 1 }),
        clamp(rgbOrXyz[3], { min: 0, max: 1 })
      ];
    }
  }
  asLegacyColor() {
    return this.as(Format.RGBA);
  }
  as(format) {
    if (this.#colorSpace === format) {
      return this;
    }
    if (this.#origin) {
      return this.#origin.as(format);
    }
    return this.#conversions[format]();
  }
  equal(color) {
    const space = color.as(this.#colorSpace);
    return space.#spec[0] === this.#spec[0] && space.#spec[1] === this.#spec[1] && space.#spec[2] === this.#spec[2] && space.#spec[3] === this.#spec[3];
  }
  format() {
    return this.#colorSpace;
  }
  setAlpha(alpha) {
    return new ColorFunction(this.#colorSpace, [this.#spec[0], this.#spec[1], this.#spec[2], alpha], void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    if (this.#originalText) {
      return this.#originalText;
    }
    const alpha = this.#spec[3] === null || this.#spec[3] === 1 ? "" : ` / ${stringifyWithPrecision(this.#spec[3])}`;
    return `color(${this.#colorSpace} ${stringifyWithPrecision(this.#spec[0])} ${stringifyWithPrecision(this.#spec[1])} ${stringifyWithPrecision(this.#spec[2])}${alpha})`;
  }
}
export class Legacy {
  #hslaInternal;
  #hwbaInternal;
  #rgbaInternal;
  #originalText;
  #formatInternal;
  #origin;
  #conversions = {
    [Format.Nickname]: () => new Legacy(this.#rgbaInternal, Format.Nickname, void 0, this),
    [Format.HEX]: () => new Legacy(this.#rgbaInternal, Format.HEX, void 0, this),
    [Format.ShortHEX]: () => new Legacy(this.#rgbaInternal, Format.ShortHEX, void 0, this),
    [Format.HEXA]: () => new Legacy(this.#rgbaInternal, Format.HEXA, void 0, this),
    [Format.ShortHEXA]: () => new Legacy(this.#rgbaInternal, Format.ShortHEXA, void 0, this),
    [Format.RGB]: () => new Legacy(this.#rgbaInternal, Format.RGB, void 0, this),
    [Format.RGBA]: () => new Legacy(this.#rgbaInternal, Format.RGBA, void 0, this),
    [Format.HSL]: () => new Legacy(this.#rgbaInternal, Format.HSL, void 0, this),
    [Format.HSLA]: () => new Legacy(this.#rgbaInternal, Format.HSLA, void 0, this),
    [Format.HWB]: () => new Legacy(this.#rgbaInternal, Format.HWB, void 0, this),
    [Format.HWBA]: () => new Legacy(this.#rgbaInternal, Format.HWBA, void 0, this),
    [Format.LCH]: () => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.OKLCH]: () => new Oklch(...ColorConverter.xyzd50ToOklch(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.LAB]: () => new Lab(...ColorConverter.xyzd50ToLab(...this.#toXyzd50()), this.#alpha, void 0, this),
    [Format.OKLAB]: () => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...this.#toXyzd50())), this.#alpha, void 0, this),
    [Format.SRGB]: () => new ColorFunction(Format.SRGB, [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.SRGB_LINEAR]: () => new ColorFunction(Format.SRGB_LINEAR, [...ColorConverter.xyzd50TosRGBLinear(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.DISPLAY_P3]: () => new ColorFunction(Format.DISPLAY_P3, [...ColorConverter.xyzd50ToDisplayP3(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.A98_RGB]: () => new ColorFunction(Format.A98_RGB, [...ColorConverter.xyzd50ToAdobeRGB(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.PROPHOTO_RGB]: () => new ColorFunction(Format.PROPHOTO_RGB, [...ColorConverter.xyzd50ToProPhoto(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.REC_2020]: () => new ColorFunction(Format.REC_2020, [...ColorConverter.xyzd50ToRec2020(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ]: () => new ColorFunction(Format.XYZ, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this),
    [Format.XYZ_D50]: () => new ColorFunction(Format.XYZ_D50, [...this.#toXyzd50(), this.#alpha], void 0, this),
    [Format.XYZ_D65]: () => new ColorFunction(Format.XYZ_D65, [...ColorConverter.xyzd50ToD65(...this.#toXyzd50()), this.#alpha], void 0, this)
  };
  #toXyzd50() {
    const [r, g, b] = this.#rgbaInternal;
    return ColorConverter.srgbToXyzd50(r, g, b);
  }
  get #alpha() {
    switch (this.format()) {
      case Format.HEXA:
      case Format.ShortHEXA:
      case Format.RGBA:
      case Format.HSLA:
      case Format.HWBA:
        return this.#rgbaInternal[3];
      default:
        return null;
    }
  }
  asLegacyColor() {
    return this;
  }
  constructor(rgba, format, originalText, origin) {
    this.#hslaInternal = void 0;
    this.#hwbaInternal = void 0;
    this.#originalText = originalText || null;
    this.#formatInternal = format;
    this.#origin = origin;
    this.#rgbaInternal = [
      clamp(rgba[0], { min: 0, max: 1 }),
      clamp(rgba[1], { min: 0, max: 1 }),
      clamp(rgba[2], { min: 0, max: 1 }),
      clamp(rgba[3] ?? 1, { min: 0, max: 1 })
    ];
  }
  static fromHex(hex, text) {
    hex = hex.toLowerCase();
    let format;
    if (hex.length === 3) {
      format = Format.ShortHEX;
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    } else if (hex.length === 4) {
      format = Format.ShortHEXA;
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3);
    } else if (hex.length === 6) {
      format = Format.HEX;
    } else {
      format = Format.HEXA;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    let a = 1;
    if (hex.length === 8) {
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    return new Legacy([r / 255, g / 255, b / 255, a], format, text);
  }
  static fromName(name, text) {
    const nickname = name.toLowerCase();
    const rgba = Nicknames.get(nickname);
    if (rgba !== void 0) {
      const color = Legacy.fromRGBA(rgba);
      color.#formatInternal = Format.Nickname;
      color.#originalText = text;
      return color;
    }
    return null;
  }
  static fromRGBAFunction(r, g, b, alpha, text) {
    const rgba = [
      parseRgbNumeric(r),
      parseRgbNumeric(g),
      parseRgbNumeric(b),
      alpha ? parseAlphaNumeric(alpha) : 1
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(rgba)) {
      return null;
    }
    return new Legacy(rgba, alpha ? Format.RGBA : Format.RGB, text);
  }
  static fromHSLA(h, s, l, alpha, text) {
    const parameters = [
      parseHueNumeric(h),
      parseSatLightNumeric(s),
      parseSatLightNumeric(l),
      alpha ? parseAlphaNumeric(alpha) : 1
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(parameters)) {
      return null;
    }
    const rgba = [];
    hsl2rgb(parameters, rgba);
    return new Legacy(rgba, alpha ? Format.HSLA : Format.HSL, text);
  }
  static fromHWB(h, w, b, alpha, text) {
    const parameters = [
      parseHueNumeric(h),
      parseSatLightNumeric(w),
      parseSatLightNumeric(b),
      alpha ? parseAlphaNumeric(alpha) : 1
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(parameters)) {
      return null;
    }
    const rgba = [];
    hwb2rgb(parameters, rgba);
    return new Legacy(rgba, alpha ? Format.HWBA : Format.HWB, text);
  }
  static fromRGBA(rgba) {
    return new Legacy([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]], Format.RGBA);
  }
  static fromHSVA(hsva) {
    const rgba = [];
    hsva2rgba(hsva, rgba);
    return new Legacy(rgba, Format.HSLA);
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    if (this.#origin) {
      return this.#origin.as(format);
    }
    return this.#conversions[format]();
  }
  format() {
    return this.#formatInternal;
  }
  hsla() {
    if (this.#hslaInternal) {
      return this.#hslaInternal;
    }
    this.#hslaInternal = rgbaToHsla(this.#rgbaInternal);
    return this.#hslaInternal;
  }
  canonicalHSLA() {
    const hsla = this.hsla();
    return [Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100), hsla[3]];
  }
  hsva() {
    const hsla = this.hsla();
    const h = hsla[0];
    let s = hsla[1];
    const l = hsla[2];
    s *= l < 0.5 ? l : 1 - l;
    return [h, s !== 0 ? 2 * s / (l + s) : 0, l + s, hsla[3]];
  }
  hwba() {
    if (this.#hwbaInternal) {
      return this.#hwbaInternal;
    }
    this.#hwbaInternal = rgbaToHwba(this.#rgbaInternal);
    return this.#hwbaInternal;
  }
  canonicalHWBA() {
    const hwba = this.hwba();
    return [Math.round(hwba[0] * 360), Math.round(hwba[1] * 100), Math.round(hwba[2] * 100), hwba[3]];
  }
  hasAlpha() {
    return this.#rgbaInternal[3] !== 1;
  }
  detectHEXFormat() {
    let canBeShort = true;
    for (let i = 0; i < 4; ++i) {
      const c = Math.round(this.#rgbaInternal[i] * 255);
      if (c % 17) {
        canBeShort = false;
        break;
      }
    }
    const hasAlpha = this.hasAlpha();
    if (canBeShort) {
      return hasAlpha ? Format.ShortHEXA : Format.ShortHEX;
    }
    return hasAlpha ? Format.HEXA : Format.HEX;
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    if (!format) {
      format = this.#formatInternal;
    }
    if (format === this.#formatInternal && this.#originalText) {
      return this.#originalText;
    }
    function toRgbValue(value) {
      return Math.round(value * 255);
    }
    function toHexValue(value) {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    function toShortHexValue(value) {
      return (Math.round(value * 255) / 17).toString(16);
    }
    switch (format) {
      case Format.RGB:
      case Format.RGBA: {
        const start = Platform.StringUtilities.sprintf("rgb(%d %d %d", toRgbValue(this.#rgbaInternal[0]), toRgbValue(this.#rgbaInternal[1]), toRgbValue(this.#rgbaInternal[2]));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(" / %d%)", Math.round(this.#rgbaInternal[3] * 100));
        }
        return start + ")";
      }
      case Format.HSL:
      case Format.HSLA: {
        const hsla = this.hsla();
        const start = Platform.StringUtilities.sprintf("hsl(%ddeg %d% %d%", Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(" / %d%)", Math.round(hsla[3] * 100));
        }
        return start + ")";
      }
      case Format.HWB:
      case Format.HWBA: {
        const hwba = this.hwba();
        const start = Platform.StringUtilities.sprintf("hwb(%ddeg %d% %d%", Math.round(hwba[0] * 360), Math.round(hwba[1] * 100), Math.round(hwba[2] * 100));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(" / %d%)", Math.round(hwba[3] * 100));
        }
        return start + ")";
      }
      case Format.HEXA: {
        return Platform.StringUtilities.sprintf("#%s%s%s%s", toHexValue(this.#rgbaInternal[0]), toHexValue(this.#rgbaInternal[1]), toHexValue(this.#rgbaInternal[2]), toHexValue(this.#rgbaInternal[3])).toLowerCase();
      }
      case Format.HEX: {
        if (this.hasAlpha()) {
          return null;
        }
        return Platform.StringUtilities.sprintf("#%s%s%s", toHexValue(this.#rgbaInternal[0]), toHexValue(this.#rgbaInternal[1]), toHexValue(this.#rgbaInternal[2])).toLowerCase();
      }
      case Format.ShortHEXA: {
        const hexFormat = this.detectHEXFormat();
        if (hexFormat !== Format.ShortHEXA && hexFormat !== Format.ShortHEX) {
          return null;
        }
        return Platform.StringUtilities.sprintf("#%s%s%s%s", toShortHexValue(this.#rgbaInternal[0]), toShortHexValue(this.#rgbaInternal[1]), toShortHexValue(this.#rgbaInternal[2]), toShortHexValue(this.#rgbaInternal[3])).toLowerCase();
      }
      case Format.ShortHEX: {
        if (this.hasAlpha()) {
          return null;
        }
        if (this.detectHEXFormat() !== Format.ShortHEX) {
          return null;
        }
        return Platform.StringUtilities.sprintf("#%s%s%s", toShortHexValue(this.#rgbaInternal[0]), toShortHexValue(this.#rgbaInternal[1]), toShortHexValue(this.#rgbaInternal[2])).toLowerCase();
      }
      case Format.Nickname: {
        return this.nickname();
      }
    }
    return this.#originalText;
  }
  rgba() {
    return this.#rgbaInternal.slice();
  }
  canonicalRGBA() {
    const rgba = new Array(4);
    for (let i = 0; i < 3; ++i) {
      rgba[i] = Math.round(this.#rgbaInternal[i] * 255);
    }
    rgba[3] = this.#rgbaInternal[3];
    return rgba;
  }
  nickname() {
    return RGBAToNickname.get(String(this.canonicalRGBA())) || null;
  }
  toProtocolRGBA() {
    const rgba = this.canonicalRGBA();
    const result = { r: rgba[0], g: rgba[1], b: rgba[2], a: void 0 };
    if (rgba[3] !== 1) {
      result.a = rgba[3];
    }
    return result;
  }
  invert() {
    const rgba = [];
    rgba[0] = 1 - this.#rgbaInternal[0];
    rgba[1] = 1 - this.#rgbaInternal[1];
    rgba[2] = 1 - this.#rgbaInternal[2];
    rgba[3] = this.#rgbaInternal[3];
    return new Legacy(rgba, Format.RGBA);
  }
  setAlpha(alpha) {
    const rgba = this.#rgbaInternal.slice();
    rgba[3] = alpha;
    return new Legacy(rgba, Format.RGBA);
  }
  blendWith(fgColor) {
    const rgba = blendColors(fgColor.#rgbaInternal, this.#rgbaInternal);
    return new Legacy(rgba, Format.RGBA);
  }
  blendWithAlpha(alpha) {
    const rgba = this.#rgbaInternal.slice();
    rgba[3] *= alpha;
    return new Legacy(rgba, Format.RGBA);
  }
  setFormat(format) {
    this.#formatInternal = format;
  }
  equal(other) {
    return this.#rgbaInternal.every((v, i) => v === other.#rgbaInternal[i]) && this.#formatInternal === other.#formatInternal;
  }
}
export const Regex = /((?:rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;
export var Format = /* @__PURE__ */ ((Format2) => {
  Format2["Nickname"] = "nickname";
  Format2["HEX"] = "hex";
  Format2["ShortHEX"] = "shorthex";
  Format2["HEXA"] = "hexa";
  Format2["ShortHEXA"] = "shorthexa";
  Format2["RGB"] = "rgb";
  Format2["RGBA"] = "rgba";
  Format2["HSL"] = "hsl";
  Format2["HSLA"] = "hsla";
  Format2["HWB"] = "hwb";
  Format2["HWBA"] = "hwba";
  Format2["LCH"] = "lch";
  Format2["OKLCH"] = "oklch";
  Format2["LAB"] = "lab";
  Format2["OKLAB"] = "oklab";
  Format2["SRGB"] = "srgb";
  Format2["SRGB_LINEAR"] = "srgb-linear";
  Format2["DISPLAY_P3"] = "display-p3";
  Format2["A98_RGB"] = "a98-rgb";
  Format2["PROPHOTO_RGB"] = "prophoto-rgb";
  Format2["REC_2020"] = "rec2020";
  Format2["XYZ"] = "xyz";
  Format2["XYZ_D50"] = "xyz-d50";
  Format2["XYZ_D65"] = "xyz-d65";
  return Format2;
})(Format || {});
const COLOR_TO_RGBA_ENTRIES = [
  ["aliceblue", [240, 248, 255]],
  ["antiquewhite", [250, 235, 215]],
  ["aqua", [0, 255, 255]],
  ["aquamarine", [127, 255, 212]],
  ["azure", [240, 255, 255]],
  ["beige", [245, 245, 220]],
  ["bisque", [255, 228, 196]],
  ["black", [0, 0, 0]],
  ["blanchedalmond", [255, 235, 205]],
  ["blue", [0, 0, 255]],
  ["blueviolet", [138, 43, 226]],
  ["brown", [165, 42, 42]],
  ["burlywood", [222, 184, 135]],
  ["cadetblue", [95, 158, 160]],
  ["chartreuse", [127, 255, 0]],
  ["chocolate", [210, 105, 30]],
  ["coral", [255, 127, 80]],
  ["cornflowerblue", [100, 149, 237]],
  ["cornsilk", [255, 248, 220]],
  ["crimson", [237, 20, 61]],
  ["cyan", [0, 255, 255]],
  ["darkblue", [0, 0, 139]],
  ["darkcyan", [0, 139, 139]],
  ["darkgoldenrod", [184, 134, 11]],
  ["darkgray", [169, 169, 169]],
  ["darkgrey", [169, 169, 169]],
  ["darkgreen", [0, 100, 0]],
  ["darkkhaki", [189, 183, 107]],
  ["darkmagenta", [139, 0, 139]],
  ["darkolivegreen", [85, 107, 47]],
  ["darkorange", [255, 140, 0]],
  ["darkorchid", [153, 50, 204]],
  ["darkred", [139, 0, 0]],
  ["darksalmon", [233, 150, 122]],
  ["darkseagreen", [143, 188, 143]],
  ["darkslateblue", [72, 61, 139]],
  ["darkslategray", [47, 79, 79]],
  ["darkslategrey", [47, 79, 79]],
  ["darkturquoise", [0, 206, 209]],
  ["darkviolet", [148, 0, 211]],
  ["deeppink", [255, 20, 147]],
  ["deepskyblue", [0, 191, 255]],
  ["dimgray", [105, 105, 105]],
  ["dimgrey", [105, 105, 105]],
  ["dodgerblue", [30, 144, 255]],
  ["firebrick", [178, 34, 34]],
  ["floralwhite", [255, 250, 240]],
  ["forestgreen", [34, 139, 34]],
  ["fuchsia", [255, 0, 255]],
  ["gainsboro", [220, 220, 220]],
  ["ghostwhite", [248, 248, 255]],
  ["gold", [255, 215, 0]],
  ["goldenrod", [218, 165, 32]],
  ["gray", [128, 128, 128]],
  ["grey", [128, 128, 128]],
  ["green", [0, 128, 0]],
  ["greenyellow", [173, 255, 47]],
  ["honeydew", [240, 255, 240]],
  ["hotpink", [255, 105, 180]],
  ["indianred", [205, 92, 92]],
  ["indigo", [75, 0, 130]],
  ["ivory", [255, 255, 240]],
  ["khaki", [240, 230, 140]],
  ["lavender", [230, 230, 250]],
  ["lavenderblush", [255, 240, 245]],
  ["lawngreen", [124, 252, 0]],
  ["lemonchiffon", [255, 250, 205]],
  ["lightblue", [173, 216, 230]],
  ["lightcoral", [240, 128, 128]],
  ["lightcyan", [224, 255, 255]],
  ["lightgoldenrodyellow", [250, 250, 210]],
  ["lightgreen", [144, 238, 144]],
  ["lightgray", [211, 211, 211]],
  ["lightgrey", [211, 211, 211]],
  ["lightpink", [255, 182, 193]],
  ["lightsalmon", [255, 160, 122]],
  ["lightseagreen", [32, 178, 170]],
  ["lightskyblue", [135, 206, 250]],
  ["lightslategray", [119, 136, 153]],
  ["lightslategrey", [119, 136, 153]],
  ["lightsteelblue", [176, 196, 222]],
  ["lightyellow", [255, 255, 224]],
  ["lime", [0, 255, 0]],
  ["limegreen", [50, 205, 50]],
  ["linen", [250, 240, 230]],
  ["magenta", [255, 0, 255]],
  ["maroon", [128, 0, 0]],
  ["mediumaquamarine", [102, 205, 170]],
  ["mediumblue", [0, 0, 205]],
  ["mediumorchid", [186, 85, 211]],
  ["mediumpurple", [147, 112, 219]],
  ["mediumseagreen", [60, 179, 113]],
  ["mediumslateblue", [123, 104, 238]],
  ["mediumspringgreen", [0, 250, 154]],
  ["mediumturquoise", [72, 209, 204]],
  ["mediumvioletred", [199, 21, 133]],
  ["midnightblue", [25, 25, 112]],
  ["mintcream", [245, 255, 250]],
  ["mistyrose", [255, 228, 225]],
  ["moccasin", [255, 228, 181]],
  ["navajowhite", [255, 222, 173]],
  ["navy", [0, 0, 128]],
  ["oldlace", [253, 245, 230]],
  ["olive", [128, 128, 0]],
  ["olivedrab", [107, 142, 35]],
  ["orange", [255, 165, 0]],
  ["orangered", [255, 69, 0]],
  ["orchid", [218, 112, 214]],
  ["palegoldenrod", [238, 232, 170]],
  ["palegreen", [152, 251, 152]],
  ["paleturquoise", [175, 238, 238]],
  ["palevioletred", [219, 112, 147]],
  ["papayawhip", [255, 239, 213]],
  ["peachpuff", [255, 218, 185]],
  ["peru", [205, 133, 63]],
  ["pink", [255, 192, 203]],
  ["plum", [221, 160, 221]],
  ["powderblue", [176, 224, 230]],
  ["purple", [128, 0, 128]],
  ["rebeccapurple", [102, 51, 153]],
  ["red", [255, 0, 0]],
  ["rosybrown", [188, 143, 143]],
  ["royalblue", [65, 105, 225]],
  ["saddlebrown", [139, 69, 19]],
  ["salmon", [250, 128, 114]],
  ["sandybrown", [244, 164, 96]],
  ["seagreen", [46, 139, 87]],
  ["seashell", [255, 245, 238]],
  ["sienna", [160, 82, 45]],
  ["silver", [192, 192, 192]],
  ["skyblue", [135, 206, 235]],
  ["slateblue", [106, 90, 205]],
  ["slategray", [112, 128, 144]],
  ["slategrey", [112, 128, 144]],
  ["snow", [255, 250, 250]],
  ["springgreen", [0, 255, 127]],
  ["steelblue", [70, 130, 180]],
  ["tan", [210, 180, 140]],
  ["teal", [0, 128, 128]],
  ["thistle", [216, 191, 216]],
  ["tomato", [255, 99, 71]],
  ["turquoise", [64, 224, 208]],
  ["violet", [238, 130, 238]],
  ["wheat", [245, 222, 179]],
  ["white", [255, 255, 255]],
  ["whitesmoke", [245, 245, 245]],
  ["yellow", [255, 255, 0]],
  ["yellowgreen", [154, 205, 50]],
  ["transparent", [0, 0, 0, 0]]
];
Platform.DCHECK(() => {
  return COLOR_TO_RGBA_ENTRIES.every(([nickname]) => nickname.toLowerCase() === nickname);
}, "All color nicknames must be lowercase.");
export const Nicknames = new Map(COLOR_TO_RGBA_ENTRIES);
const RGBAToNickname = new Map(COLOR_TO_RGBA_ENTRIES.map(([nickname, [r, g, b, a = 1]]) => {
  return [String([r, g, b, a]), nickname];
}));
const LAYOUT_LINES_HIGHLIGHT_COLOR = [127, 32, 210];
export const PageHighlight = {
  Content: Legacy.fromRGBA([111, 168, 220, 0.66]),
  ContentLight: Legacy.fromRGBA([111, 168, 220, 0.5]),
  ContentOutline: Legacy.fromRGBA([9, 83, 148]),
  Padding: Legacy.fromRGBA([147, 196, 125, 0.55]),
  PaddingLight: Legacy.fromRGBA([147, 196, 125, 0.4]),
  Border: Legacy.fromRGBA([255, 229, 153, 0.66]),
  BorderLight: Legacy.fromRGBA([255, 229, 153, 0.5]),
  Margin: Legacy.fromRGBA([246, 178, 107, 0.66]),
  MarginLight: Legacy.fromRGBA([246, 178, 107, 0.5]),
  EventTarget: Legacy.fromRGBA([255, 196, 196, 0.66]),
  Shape: Legacy.fromRGBA([96, 82, 177, 0.8]),
  ShapeMargin: Legacy.fromRGBA([96, 82, 127, 0.6]),
  CssGrid: Legacy.fromRGBA([75, 0, 130, 1]),
  LayoutLine: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GridBorder: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GapBackground: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 0.3]),
  GapHatch: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 0.8]),
  GridAreaBorder: Legacy.fromRGBA([26, 115, 232, 1])
};
export const SourceOrderHighlight = {
  ParentOutline: Legacy.fromRGBA([224, 90, 183, 1]),
  ChildOutline: Legacy.fromRGBA([0, 120, 212, 1])
};
export const IsolationModeHighlight = {
  Resizer: Legacy.fromRGBA([222, 225, 230, 1]),
  ResizerHandle: Legacy.fromRGBA([166, 166, 166, 1]),
  Mask: Legacy.fromRGBA([248, 249, 249, 1])
};
export class Generator {
  #hueSpace;
  #satSpace;
  #lightnessSpace;
  #alphaSpace;
  #colors;
  constructor(hueSpace, satSpace, lightnessSpace, alphaSpace) {
    this.#hueSpace = hueSpace || { min: 0, max: 360, count: void 0 };
    this.#satSpace = satSpace || 67;
    this.#lightnessSpace = lightnessSpace || 80;
    this.#alphaSpace = alphaSpace || 1;
    this.#colors = /* @__PURE__ */ new Map();
  }
  setColorForID(id, color) {
    this.#colors.set(id, color);
  }
  colorForID(id) {
    let color = this.#colors.get(id);
    if (!color) {
      color = this.generateColorForID(id);
      this.#colors.set(id, color);
    }
    return color;
  }
  generateColorForID(id) {
    const hash = Platform.StringUtilities.hashCode(id);
    const h = this.indexToValueInSpace(hash, this.#hueSpace);
    const s = this.indexToValueInSpace(hash >> 8, this.#satSpace);
    const l = this.indexToValueInSpace(hash >> 16, this.#lightnessSpace);
    const a = this.indexToValueInSpace(hash >> 24, this.#alphaSpace);
    const start = `hsl(${h}deg ${s}% ${l}%`;
    if (a !== 1) {
      return `${start} / ${Math.floor(a * 100)}%)`;
    }
    return `${start})`;
  }
  indexToValueInSpace(index, space) {
    if (typeof space === "number") {
      return space;
    }
    const count = space.count || space.max - space.min;
    index %= count;
    return space.min + Math.floor(index / (count - 1) * (space.max - space.min));
  }
}
//# sourceMappingURL=Color.js.map
