// A pixel-buffer surface that speaks enough of the Canvas 2D API for public/effects.js to
// run unchanged. Workers have no canvas, so the alternative was a second renderer -- and
// two renderers for the same effects drift apart the moment anyone adds one.
//
// Only what effects.js actually calls is implemented. Shadows are accepted and ignored:
// they are decorative glow, and faking them costs more than it returns.

const SUBSAMPLES = 4; // vertical sub-scanlines, for edge antialiasing

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

function parseColor(input) {
  if (typeof input !== "string") return [0, 0, 0, 0];
  const s = input.trim();

  if (s[0] === "#") {
    const h = s.slice(1);
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }

  let m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(",").map((v) => parseFloat(v));
    return [p[0] | 0, p[1] | 0, p[2] | 0, p[3] === undefined ? 1 : p[3]];
  }

  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(",").map((v) => parseFloat(v));
    return [...hslToRgb(p[0], p[1] / 100, p[2] / 100), p[3] === undefined ? 1 : p[3]];
  }

  return [0, 0, 0, 1];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ---------------------------------------------------------------------------
// Gradients -- sampled per pixel when used as a fill style
// ---------------------------------------------------------------------------

class Gradient {
  constructor(kind, coords) {
    this.kind = kind;
    this.coords = coords;
    this.stops = [];
  }

  addColorStop(offset, color) {
    this.stops.push({ offset, rgba: parseColor(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }

  // A 256-entry ramp, built once. Sampling a gradient per pixel was allocating an array
  // per pixel, which dominated the whole render.
  #buildLut() {
    const lut = new Float32Array(256 * 4);
    const stops = this.stops;
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let rgba;
      if (!stops.length) rgba = [0, 0, 0, 0];
      else if (t <= stops[0].offset) rgba = stops[0].rgba;
      else if (t >= stops[stops.length - 1].offset) rgba = stops[stops.length - 1].rgba;
      else {
        rgba = stops[stops.length - 1].rgba;
        for (let j = 1; j < stops.length; j++) {
          const a = stops[j - 1], b = stops[j];
          if (t > b.offset) continue;
          const span = b.offset - a.offset;
          const k = span === 0 ? 0 : (t - a.offset) / span;
          rgba = [
            a.rgba[0] + (b.rgba[0] - a.rgba[0]) * k,
            a.rgba[1] + (b.rgba[1] - a.rgba[1]) * k,
            a.rgba[2] + (b.rgba[2] - a.rgba[2]) * k,
            a.rgba[3] + (b.rgba[3] - a.rgba[3]) * k,
          ];
          break;
        }
      }
      lut[i * 4] = rgba[0];
      lut[i * 4 + 1] = rgba[1];
      lut[i * 4 + 2] = rgba[2];
      lut[i * 4 + 3] = rgba[3];
    }
    this.lut = lut;
  }

  // Writes into `out` rather than returning a fresh array.
  colorAt(x, y, out) {
    if (!this.lut) this.#buildLut();
    let t;

    if (this.kind === "linear") {
      const [x0, y0, x1, y1] = this.coords;
      const dx = x1 - x0, dy = y1 - y0;
      const len2 = dx * dx + dy * dy;
      t = len2 === 0 ? 0 : ((x - x0) * dx + (y - y0) * dy) / len2;
    } else {
      const [, , r0, x1, y1, r1] = this.coords;
      const d = Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
      t = r1 === r0 ? 0 : (d - r0) / (r1 - r0);
    }

    const i = (t <= 0 ? 0 : t >= 1 ? 255 : (t * 255) | 0) * 4;
    const lut = this.lut;
    out[0] = lut[i];
    out[1] = lut[i + 1];
    out[2] = lut[i + 2];
    out[3] = lut[i + 3];
    return out;
  }
}

// ---------------------------------------------------------------------------
// The context
// ---------------------------------------------------------------------------

class Context2D {
  constructor(surface) {
    this.surface = surface;
    this.fillStyle = "#000";
    this.strokeStyle = "#000";
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.shadowBlur = 0;      // accepted, ignored
    this.shadowColor = "#000";
    this.filter = "none";     // accepted, ignored
    this.font = "";
    this.textAlign = "left";
    this.textBaseline = "alphabetic";

    this.matrix = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.subpaths = [];
    this.current = null;
  }

  // --- state ---

  save() {
    this.stack.push({
      matrix: this.matrix.slice(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha,
      lineWidth: this.lineWidth,
    });
  }

  restore() {
    const s = this.stack.pop();
    if (!s) return;
    this.matrix = s.matrix;
    this.fillStyle = s.fillStyle;
    this.strokeStyle = s.strokeStyle;
    this.globalAlpha = s.globalAlpha;
    this.lineWidth = s.lineWidth;
  }

  setTransform(a, b, c, d, e, f) {
    this.matrix = [a, b, c, d, e, f];
  }

  translate(x, y) {
    const m = this.matrix;
    m[4] += m[0] * x + m[2] * y;
    m[5] += m[1] * x + m[3] * y;
  }

  rotate(angle) {
    const m = this.matrix;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    this.matrix = [
      m[0] * cos + m[2] * sin, m[1] * cos + m[3] * sin,
      m[0] * -sin + m[2] * cos, m[1] * -sin + m[3] * cos,
      m[4], m[5],
    ];
  }

  apply(x, y) {
    const m = this.matrix;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }

  // --- gradients ---

  createLinearGradient(x0, y0, x1, y1) {
    return new Gradient("linear", [x0, y0, x1, y1]);
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return new Gradient("radial", [x0, y0, r0, x1, y1, r1]);
  }

  // --- paths ---

  beginPath() {
    this.subpaths = [];
    this.current = null;
  }

  moveTo(x, y) {
    this.current = [this.apply(x, y)];
    this.subpaths.push(this.current);
  }

  lineTo(x, y) {
    if (!this.current) return this.moveTo(x, y);
    this.current.push(this.apply(x, y));
  }

  closePath() {
    if (this.current && this.current.length) this.current.push(this.current[0].slice());
  }

  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  roundRect(x, y, w, h, r) {
    const rad = Math.min(typeof r === "number" ? r : 0, w / 2, h / 2);
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y);
    this.arcTo(x + w, y, rad, -Math.PI / 2, 0);
    this.lineTo(x + w, y + h - rad);
    this.arcTo(x + w - rad, y + h - rad, rad, 0, Math.PI / 2);
    this.lineTo(x + rad, y + h);
    this.arcTo(x + rad, y + h - rad, rad, Math.PI / 2, Math.PI);
    this.lineTo(x, y + rad);
    this.arcTo(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5);
    this.closePath();
  }

  // Internal helper: append an arc as line segments, without moving the pen first.
  arcTo(cx, cy, r, start, end) {
    const steps = Math.max(3, Math.ceil(Math.abs(end - start) * 8));
    for (let i = 0; i <= steps; i++) {
      const a = start + ((end - start) * i) / steps;
      this.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  }

  arc(x, y, r, start, end, ccw = false) {
    this.ellipse(x, y, r, r, 0, start, end, ccw);
  }

  ellipse(x, y, rx, ry, rotation, start, end, ccw = false) {
    if (rx < 0 || ry < 0) return; // canvas throws; effects should never ask for this
    let sweep = end - start;
    if (!ccw && sweep < 0) sweep += Math.PI * 2;
    if (ccw && sweep > 0) sweep -= Math.PI * 2;

    const steps = Math.max(8, Math.ceil(Math.abs(sweep) * 12));
    for (let i = 0; i <= steps; i++) {
      const a = start + (sweep * i) / steps;
      const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      const rx2 = px * Math.cos(rotation) - py * Math.sin(rotation);
      const ry2 = px * Math.sin(rotation) + py * Math.cos(rotation);
      if (i === 0 && !this.current) this.moveTo(x + rx2, y + ry2);
      else this.lineTo(x + rx2, y + ry2);
    }
  }

  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!this.current) return this.moveTo(x, y);
    const [sx, sy] = this.currentPointUntransformed ?? [0, 0];
    // Flatten in user space so the transform applies uniformly.
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      const px = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x;
      const py = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y;
      this.lineTo(px, py);
    }
  }

  // --- painting ---

  fill() {
    this.#paintPolygons(this.subpaths, this.fillStyle);
  }

  stroke() {
    // Each segment becomes a quad. Good enough for the thin strokes in play.
    const half = Math.max(this.lineWidth, 0.5) / 2;
    const quads = [];
    for (const path of this.subpaths) {
      for (let i = 1; i < path.length; i++) {
        const [x0, y0] = path[i - 1], [x1, y1] = path[i];
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;
        const nx = (-dy / len) * half, ny = (dx / len) * half;
        quads.push([
          [x0 + nx, y0 + ny], [x1 + nx, y1 + ny],
          [x1 - nx, y1 - ny], [x0 - nx, y0 - ny],
        ]);
      }
    }
    for (const q of quads) this.#paintPolygons([q], this.strokeStyle);
  }

  fillRect(x, y, w, h) {
    const p = [this.apply(x, y), this.apply(x + w, y), this.apply(x + w, y + h), this.apply(x, y + h)];
    this.#paintPolygons([p], this.fillStyle);
  }

  clearRect(x, y, w, h) {
    const { data, width, height } = this.surface;
    const x0 = Math.max(0, Math.floor(x)), x1 = Math.min(width, Math.ceil(x + w));
    const y0 = Math.max(0, Math.floor(y)), y1 = Math.min(height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      data.fill(0, (py * width + x0) * 4, (py * width + x1) * 4);
    }
  }

  // Scanline fill with sub-scanline coverage, which is what keeps circles from
  // looking like staircases at this size.
  #paintPolygons(polys, style) {
    const alpha = this.globalAlpha;
    if (alpha <= 0) return;

    const { data, width, height } = this.surface;
    const isGradient = style instanceof Gradient;
    const flat = isGradient ? null : parseColor(style);
    const scratch = isGradient ? new Float32Array(4) : null;

    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const p of polys) for (const [x, y] of p) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    if (!isFinite(minY) || !isFinite(minX)) return;

    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(height - 1, Math.ceil(maxY));
    // Bounding the row to the shape's own x-extent is the difference between a particle
    // costing a few pixels and costing a full scanline.
    const xStart = Math.max(0, Math.floor(minX));
    const xEnd = Math.min(width - 1, Math.ceil(maxX));
    if (xEnd < xStart) return;

    const coverage = new Float32Array(xEnd - xStart + 1);

    for (let py = yStart; py <= yEnd; py++) {
      coverage.fill(0);
      let touched = false;

      for (let s = 0; s < SUBSAMPLES; s++) {
        const sy = py + (s + 0.5) / SUBSAMPLES;
        const spans = [];

        for (const poly of polys) {
          for (let i = 0; i < poly.length; i++) {
            const [x0, y0] = poly[i];
            const [x1, y1] = poly[(i + 1) % poly.length];
            if (y0 === y1) continue;
            if (sy < Math.min(y0, y1) || sy >= Math.max(y0, y1)) continue;
            spans.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
          }
        }
        if (spans.length < 2) continue;
        spans.sort((a, b) => a - b);

        for (let i = 0; i + 1 < spans.length; i += 2) {
          const xa = Math.max(0, spans[i]), xb = Math.min(width, spans[i + 1]);
          if (xb <= xa) continue;
          touched = true;
          const first = Math.max(xStart, Math.floor(xa));
          const last = Math.min(xEnd, Math.ceil(xb) - 1);
          for (let px = first; px <= last; px++) {
            const l = Math.max(xa, px), r = Math.min(xb, px + 1);
            if (r > l) coverage[px - xStart] += (r - l) / SUBSAMPLES;
          }
        }
      }
      if (!touched) continue;

      for (let px = xStart; px <= xEnd; px++) {
        const cov = coverage[px - xStart];
        if (cov <= 0.001) continue;
        const rgba = isGradient ? style.colorAt(px + 0.5, py + 0.5, scratch) : flat;
        const a = rgba[3] * alpha * Math.min(cov, 1);
        if (a <= 0.001) continue;
        const i = (py * width + px) * 4;
        data[i]     = data[i]     + (rgba[0] - data[i]) * a;
        data[i + 1] = data[i + 1] + (rgba[1] - data[i + 1]) * a;
        data[i + 2] = data[i + 2] + (rgba[2] - data[i + 2]) * a;
        data[i + 3] = Math.max(data[i + 3], a * 255);
      }
    }
  }
}

export class RasterSurface {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.ctx = new Context2D(this);
  }

  getContext() {
    return this.ctx;
  }

  // Matches the canvas element shape that Scene expects.
  getBoundingClientRect() {
    return { width: this.width, height: this.height, left: 0, top: 0 };
  }
}
