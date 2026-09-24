// Blitting for the baked atlas: text as tintable alpha coverage, emoji as colour.
// Glyphs were rendered by a real browser at build time, so there is no font parsing here.

import ATLAS from "./generated/atlas.js";
import decodeJpeg from "./vendor/jpeg-decoder.js";
import { log } from "./log.js";

const decoded = {};

function bytes(key, b64) {
  if (!decoded[key]) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    decoded[key] = out;
  }
  return decoded[key];
}

const CODE_MIN = 32;
const CODE_MAX = 126;

export function textWidth(sizeKey, str) {
  const font = ATLAS.text[sizeKey];
  let w = 0;
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    w += code >= CODE_MIN && code <= CODE_MAX ? font.widths[code - CODE_MIN] : font.widths[0];
  }
  return w;
}

// Trims to fit, with an ellipsis, so a long trait name can't run into the score column.
export function fitText(sizeKey, str, maxWidth) {
  if (textWidth(sizeKey, str) <= maxWidth) return str;
  // ASCII only: the atlas has no U+2026, which would silently render as a space.
  let out = "";
  for (const ch of str) {
    if (textWidth(sizeKey, out + ch + "..") > maxWidth) break;
    out += ch;
  }
  return out.trimEnd() + "..";
}

export function drawText(surface, sizeKey, str, x, y, color, maxWidth = Infinity) {
  const font = ATLAS.text[sizeKey];
  const alpha = bytes("t" + sizeKey, font.alpha);
  const text = maxWidth === Infinity ? str : fitText(sizeKey, str, maxWidth);

  const [cr, cg, cb] = color;
  const { data, width: sw, height: sh } = surface;
  let penX = x;

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    const idx = code >= CODE_MIN && code <= CODE_MAX ? code - CODE_MIN : 0;
    const srcX = idx * font.cell;

    for (let gy = 0; gy < font.cell; gy++) {
      const dy = Math.round(y - font.baseline + gy);
      if (dy < 0 || dy >= sh) continue;
      for (let gx = 0; gx < font.cell; gx++) {
        const a = alpha[(gy * font.w + srcX + gx)] / 255;
        if (a <= 0.004) continue;
        const dx = Math.round(penX + gx - font.pad);
        if (dx < 0 || dx >= sw) continue;
        const i = (dy * sw + dx) * 4;
        data[i] += (cr - data[i]) * a;
        data[i + 1] += (cg - data[i + 1]) * a;
        data[i + 2] += (cb - data[i + 2]) * a;
        data[i + 3] = Math.max(data[i + 3], a * 255);
      }
    }
    penX += font.widths[idx];
  }
  return penX - x;
}

// Nearest-neighbour is fine here: emoji are baked at 20px and drawn at 14-20px.
export function drawEmoji(surface, glyph, x, y, size) {
  const meta = ATLAS.emoji;
  const idx = meta.index[glyph];
  if (idx === undefined) return;

  const rgba = bytes("emoji", meta.rgba);
  const { data, width: sw, height: sh } = surface;
  const srcX = idx * meta.cell;
  const scale = meta.cell / size;

  for (let dy = 0; dy < size; dy++) {
    const ty = Math.round(y + dy);
    if (ty < 0 || ty >= sh) continue;
    const sy = Math.min(meta.cell - 1, (dy * scale) | 0);
    for (let dx = 0; dx < size; dx++) {
      const tx = Math.round(x + dx);
      if (tx < 0 || tx >= sw) continue;
      const sx = Math.min(meta.cell - 1, (dx * scale) | 0);
      const si = (sy * meta.w + srcX + sx) * 4;
      const a = rgba[si + 3] / 255;
      if (a <= 0.004) continue;
      const di = (ty * sw + tx) * 4;
      data[di] += (rgba[si] - data[di]) * a;
      data[di + 1] += (rgba[si + 1] - data[di + 1]) * a;
      data[di + 2] += (rgba[si + 2] - data[di + 2]) * a;
      data[di + 3] = Math.max(data[di + 3], a * 255);
    }
  }
}

export function fillRect(surface, x, y, w, h, color) {
  const { data, width: sw, height: sh } = surface;
  const [r, g, b, a = 1] = color;
  const x0 = Math.max(0, x | 0), x1 = Math.min(sw, (x + w) | 0);
  const y0 = Math.max(0, y | 0), y1 = Math.min(sh, (y + h) | 0);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = (py * sw + px) * 4;
      data[i] += (r - data[i]) * a;
      data[i + 1] += (g - data[i + 1]) * a;
      data[i + 2] += (b - data[i + 2]) * a;
      data[i + 3] = 255;
    }
  }
}

// Copies one surface into another at an offset, ignoring alpha (the scene is opaque).
export function blitSurface(dest, src, x, y) {
  const rowBytes = src.width * 4;
  for (let sy = 0; sy < src.height; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= dest.height) continue;
    const from = sy * rowBytes;
    const to = (dy * dest.width + x) * 4;
    dest.data.set(src.data.subarray(from, from + rowBytes), to);
  }
}

export const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// A Worker has 128MB. The decoder's own default ceiling is 512MB, so a huge photo would
// kill the isolate outright -- no card, no log, a blank embed. Capped, it throws instead,
// which is caught below and costs only the photo. Dog CEO photos run well under 2MP
// (~12 bytes a pixel while decoding); this leaves room for several times that.
const DECODE_LIMITS = { maxMemoryUsageInMB: 64, maxResolutionInMP: 8 };

// Decoding is the expensive half and the photo never changes between frames, so it is
// split out and done once.
export function decodePhoto(jpegBytes) {
  try {
    const img = decodeJpeg(jpegBytes, { useTArray: true, ...DECODE_LIMITS });
    if (img?.width && img?.height) return img;
    log.warn("photo.decode_failed", { bytes: jpegBytes.byteLength, reason: "empty image" });
    return null;
  } catch (err) {
    // Not a JPEG we can read; the card renders without a photo.
    const head = [...jpegBytes.slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
    log.warn("photo.decode_failed", { bytes: jpegBytes.byteLength, head, err });
    return null;
  }
}

// Draws a decoded photo inscribed in an ellipse, the way the web game frames a dog.
export function drawPhotoEllipse(surface, img, cx, cy, maxW, maxH, ring) {
  if (!img) return false;

  // Fit inside the box, preserving the photo's own aspect ratio, so nothing is cropped.
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const dw = Math.max(1, Math.round(img.width * scale));
  const dh = Math.max(1, Math.round(img.height * scale));
  const x0 = Math.round(cx - dw / 2);
  const y0 = Math.round(cy - dh / 2);
  const rx = dw / 2, ry = dh / 2;

  const { data, width: sw, height: sh } = surface;

  for (let dy = 0; dy < dh; dy++) {
    const ty = y0 + dy;
    if (ty < 0 || ty >= sh) continue;
    const ny = (dy - ry + 0.5) / ry;
    const sy = Math.min(img.height - 1, (dy / scale) | 0);

    for (let dx = 0; dx < dw; dx++) {
      const tx = x0 + dx;
      if (tx < 0 || tx >= sw) continue;
      const nx = (dx - rx + 0.5) / rx;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;

      // Feather the last few percent of the radius so the edge isn't a staircase.
      const a = d > 0.92 ? Math.max(0, (1 - d) / 0.08) : 1;
      const si = (sy * img.width + Math.min(img.width - 1, (dx / scale) | 0)) * 4;
      const di = (ty * sw + tx) * 4;
      data[di] += (img.data[si] - data[di]) * a;
      data[di + 1] += (img.data[si + 1] - data[di + 1]) * a;
      data[di + 2] += (img.data[si + 2] - data[di + 2]) * a;
      data[di + 3] = 255;
    }
  }

  if (ring) {
    const [rr, rg, rb] = ring;
    const thickness = Math.max(2, Math.round(Math.min(dw, dh) * 0.018));
    for (let dy = -thickness; dy < dh + thickness; dy++) {
      const ty = y0 + dy;
      if (ty < 0 || ty >= sh) continue;
      const ny = (dy - ry + 0.5) / (ry + thickness / 2);
      for (let dx = -thickness; dx < dw + thickness; dx++) {
        const tx = x0 + dx;
        if (tx < 0 || tx >= sw) continue;
        const nx = (dx - rx + 0.5) / (rx + thickness / 2);
        const d = Math.sqrt(nx * nx + ny * ny);
        if (d > 1.02 || d < 0.965) continue;
        const di = (ty * sw + tx) * 4;
        data[di] += (rr - data[di]) * 0.95;
        data[di + 1] += (rg - data[di + 1]) * 0.95;
        data[di + 2] += (rb - data[di + 2]) * 0.95;
        data[di + 3] = 255;
      }
    }
  }
  return true;
}
