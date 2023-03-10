export const _Eps = 1e-5;
export class Vector {
  x;
  y;
  z;
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  normalize() {
    const length = this.length();
    if (length <= _Eps) {
      return;
    }
    this.x /= length;
    this.y /= length;
    this.z /= length;
  }
}
export class Point {
  x;
  y;
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  distanceTo(p) {
    return Math.sqrt(Math.pow(p.x - this.x, 2) + Math.pow(p.y - this.y, 2));
  }
  projectOn(line) {
    if (line.x === 0 && line.y === 0) {
      return new Point(0, 0);
    }
    return line.scale((this.x * line.x + this.y * line.y) / (Math.pow(line.x, 2) + Math.pow(line.y, 2)));
  }
  scale(scalar) {
    return new Point(this.x * scalar, this.y * scalar);
  }
  toString() {
    return Math.round(this.x * 100) / 100 + ", " + Math.round(this.y * 100) / 100;
  }
}
export class CubicBezier {
  controlPoints;
  constructor(point1, point2) {
    this.controlPoints = [point1, point2];
  }
  static parse(text) {
    const keywordValues = CubicBezier.KeywordValues;
    const value = text.toLowerCase().replace(/\s+/g, "");
    if (keywordValues.has(value)) {
      return CubicBezier.parse(keywordValues.get(value));
    }
    const bezierRegex = /^cubic-bezier\(([^,]+),([^,]+),([^,]+),([^,]+)\)$/;
    const match = value.match(bezierRegex);
    if (match) {
      const control1 = new Point(parseFloat(match[1]), parseFloat(match[2]));
      const control2 = new Point(parseFloat(match[3]), parseFloat(match[4]));
      return new CubicBezier(control1, control2);
    }
    return null;
  }
  evaluateAt(t) {
    function evaluate(v1, v2, t2) {
      return 3 * (1 - t2) * (1 - t2) * t2 * v1 + 3 * (1 - t2) * t2 * t2 * v2 + Math.pow(t2, 3);
    }
    const x = evaluate(this.controlPoints[0].x, this.controlPoints[1].x, t);
    const y = evaluate(this.controlPoints[0].y, this.controlPoints[1].y, t);
    return new Point(x, y);
  }
  asCSSText() {
    const raw = "cubic-bezier(" + this.controlPoints.join(", ") + ")";
    const keywordValues = CubicBezier.KeywordValues;
    for (const [keyword, value] of keywordValues) {
      if (raw === value) {
        return keyword;
      }
    }
    return raw;
  }
  static Regex = /((cubic-bezier\([^)]+\))|\b(linear(?!-)|ease-in-out|ease-in|ease-out|ease)\b)/g;
  static KeywordValues = /* @__PURE__ */ new Map([
    ["linear", "cubic-bezier(0, 0, 1, 1)"],
    ["ease", "cubic-bezier(0.25, 0.1, 0.25, 1)"],
    ["ease-in", "cubic-bezier(0.42, 0, 1, 1)"],
    ["ease-in-out", "cubic-bezier(0.42, 0, 0.58, 1)"],
    ["ease-out", "cubic-bezier(0, 0, 0.58, 1)"]
  ]);
}
export class EulerAngles {
  alpha;
  beta;
  gamma;
  constructor(alpha, beta, gamma) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
  }
  static fromDeviceOrientationRotationMatrix(rotationMatrix) {
    let alpha, beta, gamma;
    if (Math.abs(rotationMatrix.m33) < _Eps) {
      if (Math.abs(rotationMatrix.m13) < _Eps) {
        alpha = Math.atan2(rotationMatrix.m12, rotationMatrix.m11);
        beta = rotationMatrix.m23 > 0 ? Math.PI / 2 : -(Math.PI / 2);
        gamma = 0;
      } else if (rotationMatrix.m13 > 0) {
        alpha = Math.atan2(-rotationMatrix.m21, rotationMatrix.m22);
        beta = Math.asin(rotationMatrix.m23);
        gamma = -(Math.PI / 2);
      } else {
        alpha = Math.atan2(rotationMatrix.m21, -rotationMatrix.m22);
        beta = -Math.asin(rotationMatrix.m23);
        beta += beta > 0 || Math.abs(beta) < _Eps ? -Math.PI : Math.PI;
        gamma = -(Math.PI / 2);
      }
    } else if (rotationMatrix.m33 > 0) {
      alpha = Math.atan2(-rotationMatrix.m21, rotationMatrix.m22);
      beta = Math.asin(rotationMatrix.m23);
      gamma = Math.atan2(-rotationMatrix.m13, rotationMatrix.m33);
    } else {
      alpha = Math.atan2(rotationMatrix.m21, -rotationMatrix.m22);
      beta = -Math.asin(rotationMatrix.m23);
      beta += beta > 0 || Math.abs(beta) < _Eps ? -Math.PI : Math.PI;
      gamma = Math.atan2(rotationMatrix.m13, -rotationMatrix.m33);
    }
    if (alpha < -_Eps) {
      alpha += 2 * Math.PI;
    }
    alpha = Number(radiansToDegrees(alpha).toFixed(6));
    beta = Number(radiansToDegrees(beta).toFixed(6));
    gamma = Number(radiansToDegrees(gamma).toFixed(6));
    return new EulerAngles(alpha, beta, gamma);
  }
}
export const scalarProduct = function(u, v) {
  return u.x * v.x + u.y * v.y + u.z * v.z;
};
export const crossProduct = function(u, v) {
  const x = u.y * v.z - u.z * v.y;
  const y = u.z * v.x - u.x * v.z;
  const z = u.x * v.y - u.y * v.x;
  return new Vector(x, y, z);
};
export const subtract = function(u, v) {
  const x = u.x - v.x;
  const y = u.y - v.y;
  const z = u.z - v.z;
  return new Vector(x, y, z);
};
export const multiplyVectorByMatrixAndNormalize = function(v, m) {
  const t = v.x * m.m14 + v.y * m.m24 + v.z * m.m34 + m.m44;
  const x = (v.x * m.m11 + v.y * m.m21 + v.z * m.m31 + m.m41) / t;
  const y = (v.x * m.m12 + v.y * m.m22 + v.z * m.m32 + m.m42) / t;
  const z = (v.x * m.m13 + v.y * m.m23 + v.z * m.m33 + m.m43) / t;
  return new Vector(x, y, z);
};
export const calculateAngle = function(u, v) {
  const uLength = u.length();
  const vLength = v.length();
  if (uLength <= _Eps || vLength <= _Eps) {
    return 0;
  }
  const cos = scalarProduct(u, v) / uLength / vLength;
  if (Math.abs(cos) > 1) {
    return 0;
  }
  return radiansToDegrees(Math.acos(cos));
};
export const degreesToRadians = function(deg) {
  return deg * Math.PI / 180;
};
export const degreesToGradians = function(deg) {
  return deg / 9 * 10;
};
export const degreesToTurns = function(deg) {
  return deg / 360;
};
export const radiansToDegrees = function(rad) {
  return rad * 180 / Math.PI;
};
export const radiansToGradians = function(rad) {
  return rad * 200 / Math.PI;
};
export const radiansToTurns = function(rad) {
  return rad / (2 * Math.PI);
};
export const gradiansToRadians = function(grad) {
  return grad * Math.PI / 200;
};
export const turnsToRadians = function(turns) {
  return turns * 2 * Math.PI;
};
export const boundsForTransformedPoints = function(matrix, points, aggregateBounds) {
  if (!aggregateBounds) {
    aggregateBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  }
  if (points.length % 3) {
    console.warn("Invalid size of points array");
  }
  for (let p = 0; p < points.length; p += 3) {
    let vector = new Vector(points[p], points[p + 1], points[p + 2]);
    vector = multiplyVectorByMatrixAndNormalize(vector, matrix);
    aggregateBounds.minX = Math.min(aggregateBounds.minX, vector.x);
    aggregateBounds.maxX = Math.max(aggregateBounds.maxX, vector.x);
    aggregateBounds.minY = Math.min(aggregateBounds.minY, vector.y);
    aggregateBounds.maxY = Math.max(aggregateBounds.maxY, vector.y);
  }
  return aggregateBounds;
};
export class Size {
  width;
  height;
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  clipTo(size) {
    if (!size) {
      return this;
    }
    return new Size(Math.min(this.width, size.width), Math.min(this.height, size.height));
  }
  scale(scale) {
    return new Size(this.width * scale, this.height * scale);
  }
  isEqual(size) {
    return size !== null && this.width === size.width && this.height === size.height;
  }
  widthToMax(size) {
    return new Size(Math.max(this.width, typeof size === "number" ? size : size.width), this.height);
  }
  addWidth(size) {
    return new Size(this.width + (typeof size === "number" ? size : size.width), this.height);
  }
  heightToMax(size) {
    return new Size(this.width, Math.max(this.height, typeof size === "number" ? size : size.height));
  }
  addHeight(size) {
    return new Size(this.width, this.height + (typeof size === "number" ? size : size.height));
  }
}
export class Constraints {
  minimum;
  preferred;
  constructor(minimum, preferred) {
    this.minimum = minimum || new Size(0, 0);
    this.preferred = preferred || this.minimum;
    if (this.minimum.width > this.preferred.width || this.minimum.height > this.preferred.height) {
      throw new Error("Minimum size is greater than preferred.");
    }
  }
  isEqual(constraints) {
    return constraints !== null && this.minimum.isEqual(constraints.minimum) && this.preferred.isEqual(constraints.preferred);
  }
  widthToMax(value) {
    if (typeof value === "number") {
      return new Constraints(this.minimum.widthToMax(value), this.preferred.widthToMax(value));
    }
    return new Constraints(this.minimum.widthToMax(value.minimum), this.preferred.widthToMax(value.preferred));
  }
  addWidth(value) {
    if (typeof value === "number") {
      return new Constraints(this.minimum.addWidth(value), this.preferred.addWidth(value));
    }
    return new Constraints(this.minimum.addWidth(value.minimum), this.preferred.addWidth(value.preferred));
  }
  heightToMax(value) {
    if (typeof value === "number") {
      return new Constraints(this.minimum.heightToMax(value), this.preferred.heightToMax(value));
    }
    return new Constraints(this.minimum.heightToMax(value.minimum), this.preferred.heightToMax(value.preferred));
  }
  addHeight(value) {
    if (typeof value === "number") {
      return new Constraints(this.minimum.addHeight(value), this.preferred.addHeight(value));
    }
    return new Constraints(this.minimum.addHeight(value.minimum), this.preferred.addHeight(value.preferred));
  }
}
//# sourceMappingURL=Geometry.js.map
