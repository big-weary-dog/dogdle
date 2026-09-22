// Headless card renderer: turns a rolled dog into an animated GIF with no canvas and no
// DOM, so it can run inside a Worker for the Discord bot.
//
// It drives the same public/effects.js the web game uses, against the raster surface in
// raster.js. One renderer, two backends -- the alternative was a second implementation of
// every effect, which would drift the first time anyone added one.

import { RasterSurface } from "./raster.js";
import { paintWorld, createLayers } from "../public/effects.js";
import { GIFEncoder, quantize, applyPalette } from "../public/vendor/gifenc.js";

// Discord renders an embed image about 400px wide, so rendering larger buys nothing but
// CPU and bytes. 12 frames still reads as motion.
export const CARD = {
  width: 400,
  height: 300,
  frames: 12,
  delay: 120,
};

export function renderCardGif(dog, opts = {}) {
  const w = opts.width ?? CARD.width;
  const h = opts.height ?? CARD.height;
  const frames = opts.frames ?? CARD.frames;
  const delay = opts.delay ?? CARD.delay;

  const surface = new RasterSurface(w, h);
  const ctx = surface.getContext();
  const effects = [dog.background.effect, ...dog.modifiers.map((m) => m.effect)];
  const back = createLayers(effects, "back");
  const front = createLayers(effects, "front");

  // The world -- sky, scenery, ground, haze -- never changes between frames, and painting
  // it is by far the most expensive thing here. Paint it once and copy it per frame.
  paintWorld(ctx, w, h, dog.background);
  const base = surface.data.slice();

  const gif = GIFEncoder();
  let palette = null;
  let t = 0;

  for (let f = 0; f < frames; f++) {
    surface.data.set(base);
    for (const layer of back) layer.draw(ctx, w, h, delay, t);
    for (const layer of front) layer.draw(ctx, w, h, delay, t);
    t += delay;

    // One palette for the whole animation compresses far better than one per frame.
    if (!palette) palette = quantize(surface.data, 256);
    gif.writeFrame(applyPalette(surface.data, palette), w, h, { palette, delay });
  }

  gif.finish();
  return gif.bytes();
}
