// The card renderer runs every effect through the raster surface instead of a real canvas,
// so these are mostly a guard against an effect (or a raster primitive) throwing on a
// combination nobody happened to eyeball.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rollDailyDog } from "../src/roll.js";
import { renderCardGif, composeCard, layoutRows, CARD } from "../src/card.js";
import { readFileSync } from "node:fs";
import {
  BACKGROUNDS, MODIFIERS, FROG, FROG_TRAITS, FROG_PHOTOS, SEASONAL_TRAITS, SEASONAL_BACKGROUNDS,
} from "../src/content/index.js";
import ATLAS from "../src/generated/atlas.js";
import { KENNEL_EMOJI } from "../src/kennel.js";
import { decodePhoto } from "../src/draw.js";
import decodeJpeg from "../src/vendor/jpeg-decoder.js";
import { setLogSink } from "../src/log.js";

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
  const specs = [...BACKGROUNDS, ...SEASONAL_BACKGROUNDS, ...MODIFIERS, ...SEASONAL_TRAITS, ...FROG_TRAITS].map((x) => x.effect);

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

// The punchline is usually at the end of a trait, so a trimmed name is a broken joke.
const rowsOf = (dog) => [
  ...(dog.breedValue ? [{ text: dog.frog ? FROG.row : dog.breed, value: dog.breedValue }] : []),
  { text: dog.background.name, value: dog.background.value },
  ...dog.modifiers,
];
const trimmed = (lines) => lines.at(-1).endsWith("..");

test("every trait name fits on the card, wrapping rather than trimming", () => {
  for (const m of [...MODIFIERS.filter((t) => !t.obsolete), ...SEASONAL_TRAITS, ...FROG_TRAITS]) {
    const { lines } = layoutRows([m]);
    assert.ok(!trimmed(lines[0]), `"${m.text}" doesn't fit in two lines`);
    assert.equal(lines[0].join(" "), m.text, `"${m.text}" lost words when wrapped`);
  }
  for (const b of [...BACKGROUNDS, ...SEASONAL_BACKGROUNDS]) {
    const { lines } = layoutRows([{ text: b.name, value: b.value }]);
    assert.ok(!trimmed(lines[0]), `background "${b.name}" doesn't fit`);
  }
});

test("real cards almost never trim a name, and never run off the bottom", () => {
  // Several days, not one: on a single day's 2000 cards the rate swings by half a point
  // whenever content reshuffles the rolls, which fails content PRs that didn't touch it.
  const days = ["2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"];
  const total = days.length * 2000;
  let cards = 0;
  for (let n = 0; n < total; n++) {
    const rows = rowsOf(rollDailyDog(`test-player-${n % 2000}`, days[Math.floor(n / 2000)]));
    const { rowH, lines } = layoutRows(rows);
    if (lines.some(trimmed)) cards++;

    const used = lines.reduce((h, l) => h + rowH + (l.length - 1) * 13, 0);
    assert.ok(rowH >= 19, `rows squeezed to ${rowH}px`);
    assert.ok(82 + used <= CARD.height, `sidebar runs ${82 + used - CARD.height}px off the card`);
  }
  // Only a card stacked with long names should need to trim; it was most of them before.
  assert.ok(cards / total < 0.02, `${cards} of ${total} cards trimmed a name`);
});

test("the atlas covers every emoji the card and the album draw", () => {
  const used = new Set([
    ...BACKGROUNDS.map((b) => b.emoji),
    ...MODIFIERS.map((m) => m.emoji),
    ...FROG_TRAITS.map((m) => m.emoji),
    ...SEASONAL_BACKGROUNDS.map((b) => b.emoji),
    ...SEASONAL_TRAITS.map((m) => m.emoji),
    "🧬", // the breed row, which belongs to no table
    FROG.emoji, // a frog's breed row
    ...KENNEL_EMOJI,
  ]);
  const missing = [...used].filter((e) => ATLAS.emoji.index[e] === undefined);
  assert.deepEqual(missing, [], "run scripts/build-atlas.mjs after adding emoji");
});

test("a photo too big for a Worker is refused, not decoded", () => {
  // Just a frame header claiming 10000x10000: the decoder's own 512MB default would try
  // to allocate for it and take the isolate down, where the cap throws and is caught.
  const huge = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x27, 0x10, 0x27, 0x10, 0x03,
    0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);
  const seen = [];
  const previous = setLogSink((level, entry) => seen.push(entry));
  try {
    assert.equal(decodePhoto(huge), null);
    assert.equal(decodePhoto(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null, "a PNG is not a JPEG");
  } finally {
    setLogSink(previous);
  }
  assert.deepEqual(seen.map((e) => e.event), ["photo.decode_failed", "photo.decode_failed"]);
  assert.match(seen[0].err.message, /ResolutionInMP limit exceeded/);
  assert.equal(seen[1].head, "89504e47");
});

// The mutts' Dog CEO photos are 8MP phone shots (breeds/mix), and decoding one in full
// needed ~90MB: every mutt card came out blank. These two fixtures are that size, as a
// smooth top-to-bottom gradient from #c08040 to #304060 so they stay ~50KB.
test("an 8MP photo, baseline or progressive, decodes at quarter scale under the cap", () => {
  for (const file of ["big-baseline.jpg", "big-progressive.jpg"]) {
    const img = decodePhoto(readFileSync(`test/fixtures/${file}`));
    assert.ok(img, `${file} didn't decode`);
    assert.equal(img.reduced, true, `${file} should be decoded at quarter scale`);
    assert.deepEqual([img.width, img.height], [650, 750]);
    let err = 0;
    for (const y of [10, 200, 375, 600, 740]) {
      const t = (y + 0.5) / img.height;
      const want = [0xc0 + (0x30 - 0xc0) * t, 0x80 + (0x40 - 0x80) * t, 0x40 + (0x60 - 0x40) * t];
      for (let c = 0; c < 3; c++) err = Math.max(err, Math.abs(img.data[(y * img.width + 300) * 4 + c] - want[c]));
    }
    assert.ok(err < 8, `${file}: off the gradient by ${err}`);
  }
});

test("a quarter-scale decode matches the full decode, averaged down", () => {
  // A real photo, forced down the reduced path: each output pixel should be the mean of a
  // 4x4 patch of the full decode, give or take the bits of the block it can't see.
  const bytes = readFileSync(`public/frogs/${FROG_PHOTOS[0].file}`);
  const full = decodeJpeg(bytes, { useTArray: true });
  const small = decodeJpeg(bytes, { useTArray: true, reduceAboveMP: 0.01, maxReducedResolutionInMP: 1 });
  assert.equal(small.reduced, true);
  assert.deepEqual([small.width, small.height], [Math.ceil(full.width / 4), Math.ceil(full.height / 4)]);
  let total = 0, n = 0;
  for (let y = 0; y < Math.floor(full.height / 4); y++) {
    for (let x = 0; x < Math.floor(full.width / 4); x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) sum += full.data[((y * 4 + dy) * full.width + x * 4 + dx) * 4 + c];
        total += Math.abs(sum / 16 - small.data[(y * small.width + x) * 4 + c]);
        n++;
      }
    }
  }
  assert.ok(total / n < 4, `mean error ${(total / n).toFixed(2)} against the full decode`);
});

test("a frog without a photo draws the big frog glyph", () => {
  const frog = rollDailyDog("test-player-4", "2026-09-22", { frog: true });
  assert.ok(ATLAS.hero?.[FROG.emoji], "the atlas needs the big frog: npm run atlas");
  const gif = readGif(renderCardGif(frog, { frames: 2 }));
  assert.equal(gif.frames, 2);

  // The middle of the scene should be frog-green, not whatever the background is.
  const card = composeCard(frog, { settle: 0 });
  const plain = composeCard({ ...frog, frog: false }, { settle: 0 });
  const at = (c, x, y) => [...c.data.slice((y * c.width + x) * 4, (y * c.width + x) * 4 + 3)];
  const cx = CARD.sceneWidth / 2, cy = Math.round(CARD.height * 0.5);
  assert.notDeepEqual(at(card, cx, cy), at(plain, cx, cy), "nothing drawn where the frog should be");
});

test("a frog with a photo draws the photo", () => {
  const frog = rollDailyDog("test-player-4", "2026-09-22", { frog: true });
  const photo = readFileSync(`public/frogs/${FROG_PHOTOS[0].file}`);
  const gif = readGif(renderCardGif(frog, { frames: 2, photo }));
  assert.equal(gif.frames, 2);

  const withPhoto = composeCard(frog, { settle: 0, photo });
  const glyph = composeCard(frog, { settle: 0 });
  const at = (c, x, y) => [...c.data.slice((y * c.width + x) * 4, (y * c.width + x) * 4 + 3)];
  const cx = CARD.sceneWidth / 2, cy = Math.round(CARD.height * 0.46);
  assert.notDeepEqual(at(withPhoto, cx, cy), at(glyph, cx, cy), "the photo should replace the glyph");
});
