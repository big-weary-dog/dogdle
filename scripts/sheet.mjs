// A contact sheet of backgrounds, painted by the same code the card renderer uses, with a
// placeholder where the dog's photo goes. This is how to judge a background: the dog
// covers the middle of the frame, so what matters is what's left showing around it.
//
//   node scripts/sheet.mjs                          every background -> sheet.png
//   node scripts/sheet.mjs out.png                  every background -> out.png
//   node scripts/sheet.mjs out.png beach,volcano    just those keys
//
// Open the PNG with the Read tool to look at it.

import { writeFileSync } from "fs";
import { RasterSurface } from "../src/raster.js";
import { paintWorld, createLayers } from "../public/effects.js";
import { drawText, fillRect, blitSurface } from "../src/draw.js";
import { BACKGROUNDS } from "../src/content/index.js";
import { encodePng } from "./lib/png.mjs";

const [out = "sheet.png", keyArg] = process.argv.slice(2);
const wanted = keyArg ? keyArg.split(",") : null;
const missing = wanted?.filter((k) => !BACKGROUNDS.some((b) => b.key === k)) ?? [];
if (missing.length) {
  console.error(`unknown background keys: ${missing.join(", ")}`);
  process.exit(1);
}
const list = wanted ? wanted.map((k) => BACKGROUNDS.find((b) => b.key === k)) : BACKGROUNDS;

const SW = 240, SH = 256, LABEL = 22, COLS = Math.min(5, list.length);
const ROWS = Math.ceil(list.length / COLS);
const sheet = new RasterSurface(COLS * SW, ROWS * (SH + LABEL));
fillRect(sheet, 0, 0, sheet.width, sheet.height, [10, 12, 16]);

// A stand-in for the photo, framed where the card puts the real one.
function placeholderDog(s) {
  const cx = SW / 2, cy = SH * 0.46, rx = ((SW * 0.74) / 2) * 0.75, ry = (SH * 0.62) / 2;
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1.03) continue;
      const i = (y * SW + x) * 4;
      const c = d > 0.95 ? [200, 200, 210] : [120, 104, 88];
      s.data[i] = c[0]; s.data[i + 1] = c[1]; s.data[i + 2] = c[2]; s.data[i + 3] = 255;
    }
  }
}

list.forEach((bg, n) => {
  const scene = new RasterSurface(SW, SH);
  const ctx = scene.getContext();
  paintWorld(ctx, SW, SH, bg);
  const base = scene.data.slice();
  const back = createLayers([bg.effect], "back");
  const front = createLayers([bg.effect], "front");
  // Run the animation a few frames in and keep only the last, like one frame of the GIF.
  for (let f = 0; f < 8; f++) {
    scene.data.set(base);
    for (const l of back) l.draw(ctx, SW, SH, 120, f * 120);
    placeholderDog(scene);
    for (const l of front) l.draw(ctx, SW, SH, 120, f * 120);
  }
  const ox = (n % COLS) * SW, oy = Math.floor(n / COLS) * (SH + LABEL);
  blitSurface(sheet, scene, ox, oy);
  const label = `${bg.value > 0 ? "+" : ""}${bg.value} ${bg.name}`;
  drawText(sheet, "sm", label, ox + 6, oy + SH + 15, [230, 230, 235], SW - 12);
});

for (let i = 3; i < sheet.data.length; i += 4) sheet.data[i] = 255;
writeFileSync(out, encodePng(sheet.width, sheet.height, sheet.data));
console.log(`${list.length} backgrounds -> ${out} (${sheet.width}x${sheet.height})`);
