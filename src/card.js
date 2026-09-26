// Headless card renderer: turns a rolled dog into an animated GIF with no canvas and no
// DOM, so it can run inside a Worker for the Discord bot.
//
// It drives the same public/effects.js the web game uses, against the raster surface in
// raster.js. One renderer, two backends -- the alternative was a second implementation of
// every effect, which would drift the first time anyone added one.
//
// The card is a scene on the left and a trait sidebar on the right. The sidebar is static,
// so it is painted once into the base; only the scene is redrawn per frame.

import { RasterSurface } from "./raster.js";
import { paintWorld, createLayers } from "../public/effects.js";
import { GIFEncoder, quantize, applyPalette } from "../public/vendor/gifenc.js";
import {
  drawText, drawEmoji, fillRect, blitSurface, hexToRgb, textWidth, fitText, wrapText,
  drawPhotoEllipse, decodePhoto,
} from "./draw.js";

export const CARD = {
  width: 560,
  height: 320,
  sceneWidth: 300,
  frames: 12,
  delay: 120,
};

const PANEL = [17, 20, 27];
const ROW = [26, 31, 41];
const MUTED = [152, 161, 179];
const WHITE = [243, 244, 246];
const GREEN = [74, 222, 128];
const RED = [248, 113, 113];

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

// Where the dog sits in the scene, shared by the still and animated paths.
function drawDog(scene, photo, dog, sceneW, h) {
  if (!photo) return;
  drawPhotoEllipse(scene, photo, sceneW / 2, h * 0.46, sceneW * 0.74, h * 0.62, hexToRgb(dog.rarityColor));
}

export function paintSidebar(surface, dog, x, width, height) {
  fillRect(surface, x, 0, width, height, PANEL);

  const pad = SIDEBAR_PAD;
  const left = x + pad;
  const inner = width - pad * 2;

  // Header: the dog, its breed, and the verdict.
  drawText(surface, "lg", dog.name, left, 26, WHITE, inner - 4);
  drawText(surface, "sm", `${dog.breed} · ${dog.rarityLabel}`, left, 42, MUTED, inner - 4);

  const quality = hexToRgb(dog.qualityColor);
  drawText(surface, "md", dog.qualityLabel, left, 62, quality, inner - 40);
  const scoreText = signed(dog.score);
  drawText(surface, "lg", scoreText, x + width - pad - textWidth("lg", scoreText), 64, quality);

  fillRect(surface, left, 72, inner, 1, [38, 43, 54]);

  // One row per scoring thing, so the rows visibly add up to the number above them. The
  // breed only earns a row once it's worth something -- a common breed scores nothing and
  // a row of zero would be noise on every second card.
  const rows = [
    ...(dog.breedValue ? [{ emoji: "🧬", text: dog.breed, value: dog.breedValue }] : []),
    { emoji: dog.background.emoji, text: dog.background.name, value: dog.background.value },
    ...dog.modifiers.map((m) => ({ emoji: m.emoji, text: m.text, value: m.value })),
  ];

  const { rowH, lines } = layoutRows(rows, width, height);
  const emojiSize = Math.min(16, rowH - 6);

  let y = ROWS_TOP;
  rows.forEach((row, i) => {
    const extra = (lines[i].length - 1) * LINE_H;
    if (y + rowH + extra > height) return;
    const boxH = rowH - 3 + extra;
    fillRect(surface, left, y, inner, boxH, ROW);

    const valueText = signed(row.value);
    const valueW = textWidth("sm", valueText);
    const color = row.value > 0 ? GREEN : row.value < 0 ? RED : MUTED;
    const baseline = y + boxH / 2 + 2.5;

    drawEmoji(surface, row.emoji, left + 4, y + (boxH - emojiSize) / 2, emojiSize);
    lines[i].forEach((line, n) => {
      drawText(surface, "sm", line, left + emojiSize + 9, baseline - extra / 2 + n * LINE_H, WHITE);
    });
    drawText(surface, "sm", valueText, left + inner - valueW - 5, baseline, color);
    y += rowH + extra;
  });
}

const SIDEBAR_PAD = 12;
const ROWS_TOP = 82;

const LINE_H = 13; // the second line of a wrapped name
const MIN_ROW_H = 19; // below this the emoji stops being legible

// Room for the trait name: the row, less the emoji, the value column and the gaps.
const textRoom = (inner, value) => inner - 16 - textWidth("sm", signed(value)) - 20;

// Lays the sidebar out so the names aren't cut off: the joke is usually at the end of the
// line, so a trimmed trait is a trait with no punchline. A long name gets a second line,
// and the rows share what height is left. If a card has more long names than room, the
// ones that overflow least go back to one trimmed line until everything fits.
export function layoutRows(rows, width = CARD.width - CARD.sceneWidth, height = CARD.height) {
  const inner = width - SIDEBAR_PAD * 2;
  const available = height - ROWS_TOP - 8;
  const lines = rows.map((row) => wrapText("sm", row.text, textRoom(inner, row.value), 2));
  const rowHeight = () => {
    const extra = lines.reduce((n, l) => n + (l.length - 1) * LINE_H, 0);
    return Math.min(26, Math.floor((available - extra) / Math.max(rows.length, 1)));
  };

  while (rowHeight() < MIN_ROW_H) {
    const wrapped = rows
      .map((row, i) => ({ i, over: textWidth("sm", row.text) - textRoom(inner, row.value) }))
      .filter(({ i }) => lines[i].length > 1)
      .sort((a, b) => a.over - b.over);
    if (!wrapped.length) break;
    const { i } = wrapped[0];
    lines[i] = [fitText("sm", rows[i].text, textRoom(inner, rows[i].value))];
  }

  return { rowH: rowHeight(), lines };
}

// Composes a single still card -- the same pipeline as the GIF, minus the animation.
// Used by tests and for eyeballing the layout.
export function composeCard(dog, opts = {}) {
  const w = opts.width ?? CARD.width;
  const h = opts.height ?? CARD.height;
  const sceneW = opts.sceneWidth ?? CARD.sceneWidth;

  const card = new RasterSurface(w, h);
  const scene = new RasterSurface(sceneW, h);
  const ctx = scene.getContext();
  const effects = [dog.background.effect, ...dog.modifiers.map((m) => m.effect)];

  paintWorld(ctx, sceneW, h, dog.background);
  const back = createLayers(effects, "back");
  const front = createLayers(effects, "front");
  const photo = opts.photo ? decodePhoto(opts.photo) : null;

  for (let f = 0; f < (opts.settle ?? 6); f++) {
    for (const l of back) l.draw(ctx, sceneW, h, 120, f * 120);
  }
  drawDog(scene, photo, dog, sceneW, h);
  for (let f = 0; f < (opts.settle ?? 6); f++) {
    for (const l of front) l.draw(ctx, sceneW, h, 120, f * 120);
  }

  blitSurface(card, scene, 0, 0);
  paintSidebar(card, dog, sceneW, w - sceneW, h);
  return card;
}

export function renderCardGif(dog, opts = {}) {
  const w = opts.width ?? CARD.width;
  const h = opts.height ?? CARD.height;
  const sceneW = opts.sceneWidth ?? CARD.sceneWidth;
  const frames = opts.frames ?? CARD.frames;
  const delay = opts.delay ?? CARD.delay;

  const card = new RasterSurface(w, h);
  const scene = new RasterSurface(sceneW, h);
  const ctx = scene.getContext();

  const effects = [dog.background.effect, ...dog.modifiers.map((m) => m.effect)];
  const back = createLayers(effects, "back");
  const front = createLayers(effects, "front");

  // The world never changes between frames and painting it is the most expensive thing
  // here, so paint it once and copy the buffer per frame.
  paintWorld(ctx, sceneW, h, dog.background);
  const sceneBase = scene.data.slice();
  const photo = opts.photo ? decodePhoto(opts.photo) : null;

  paintSidebar(card, dog, sceneW, w - sceneW, h);

  const gif = GIFEncoder();
  let palette = null;
  let t = 0;

  for (let f = 0; f < frames; f++) {
    scene.data.set(sceneBase);
    // Back effects sit behind the dog, front effects pass in front of it.
    for (const layer of back) layer.draw(ctx, sceneW, h, delay, t);
    drawDog(scene, photo, dog, sceneW, h);
    for (const layer of front) layer.draw(ctx, sceneW, h, delay, t);
    t += delay;

    blitSurface(card, scene, 0, 0);

    // One palette for the whole animation compresses far better than one per frame.
    if (!palette) palette = quantize(card.data, 256);
    gif.writeFrame(applyPalette(card.data, palette), w, h, { palette, delay });
  }

  gif.finish();
  return gif.bytes();
}
