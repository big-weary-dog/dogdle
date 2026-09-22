// The card renderer runs every effect through the raster surface instead of a real canvas,
// so these are mostly a guard against an effect (or a raster primitive) throwing on a
// combination nobody happened to eyeball.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rollDailyDog } from "../src/roll.js";
import { renderCardGif, composeCard, CARD } from "../src/card.js";
import { BACKGROUNDS, MODIFIERS } from "../src/content/index.js";
import ATLAS from "../src/generated/atlas.js";

const GIF89A = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

// Walks the block structure rather than scanning for byte pairs -- an image descriptor's
// two-byte marker turns up inside LZW data often enough to make scanning lie.
function readGif(bytes) {
  for (const [i, b] of GIF89A.entries()) assert.equal(bytes[i], b, "GIF89a header");

  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  const packed = bytes[10];
  let p = 13;
  if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1)); // global colour table

  const skipSubBlocks = () => {
    while (bytes[p] !== 0) p += bytes[p] + 1;
    p++;
  };

  let frames = 0;
  let sawTrailer = false;
  while (p < bytes.length) {
    const block = bytes[p++];
    if (block === 0x21) {
      p++; // extension label
      skipSubBlocks();
    } else if (block === 0x2c) {
      frames++;
      const flags = bytes[p + 8];
      p += 9;
      if (flags & 0x80) p += 3 * (1 << ((flags & 7) + 1)); // local colour table
      p++; // LZW minimum code size
      skipSubBlocks();
    } else if (block === 0x3b) {
      sawTrailer = true;
      break;
    } else {
      assert.fail(`unknown GIF block 0x${block.toString(16)} at ${p - 1}`);
    }
  }

  assert.ok(sawTrailer, "GIF has no trailer");
  return { width, height, frames };
}

test("a rendered card is a real GIF with the frames we asked for", () => {
  const dog = rollDailyDog("test-player-1", "2026-09-22");
  const gif = readGif(renderCardGif(dog, { frames: 3 }));

  assert.equal(gif.width, CARD.width);
  assert.equal(gif.height, CARD.height);
  assert.equal(gif.frames, 3);
});

test("every effect in the content tables survives a headless render", () => {
  // One dog per effect, so a broken effect fails here rather than on somebody's roll.
  const specs = [...BACKGROUNDS.map((b) => b.effect), ...MODIFIERS.map((m) => m.effect)];

  for (const effect of specs) {
    if (!effect) continue;
    const dog = rollDailyDog("test-player-2", "2026-09-22");
    dog.modifiers = [{ text: "under test", emoji: "🧪", value: 0, effect }];
    assert.doesNotThrow(() => renderCardGif(dog, { frames: 2 }), `effect ${effect.type}`);
  }
});

test("the still composer fills the whole card", () => {
  const dog = rollDailyDog("test-player-3", "2026-09-22");
  const card = composeCard(dog, { settle: 1 });

  assert.equal(card.width, CARD.width);
  assert.equal(card.height, CARD.height);
  // Alpha is set wherever anything was painted; a gap would mean a region never got drawn.
  for (let i = 3; i < card.data.length; i += 4) {
    if (card.data[i] !== 255) assert.fail(`unpainted pixel at byte ${i}`);
  }
});

test("the atlas covers every emoji the card draws", () => {
  const used = new Set([
    ...BACKGROUNDS.map((b) => b.emoji),
    ...MODIFIERS.map((m) => m.emoji),
    "🧬", // the breed row, which belongs to no table
  ]);
  const missing = [...used].filter((e) => ATLAS.emoji.index[e] === undefined);
  assert.deepEqual(missing, [], "run scripts/build-atlas.mjs after adding emoji");
});
