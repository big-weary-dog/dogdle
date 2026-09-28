// Integrity checks on the content tables. These are the cheap ones that catch a typo in a
// new trait before it ships: a missing emoji, a duplicate, an effect type that doesn't
// exist (which fails silently at runtime as "no visual").

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BACKGROUNDS, BACKGROUND_WEIGHTS, MODIFIERS, NAMES, QUALITY_TIERS,
  FROG, FROG_NAMES, FROG_TRAITS, FROG_TRAIT_COUNT_MAX, FROG_PHOTOS,
} from "../src/content/index.js";
import { readdirSync, readFileSync } from "node:fs";
import { decodePhoto } from "../src/draw.js";
import { BREEDS, RARITIES, RARITY_ORDER } from "../src/breeds.js";

const spawnable = MODIFIERS.filter((m) => !m.obsolete);

test("every modifier is fully specified", () => {
  for (const m of [...MODIFIERS, ...FROG_TRAITS]) {
    assert.ok(m.text?.length, `modifier missing text: ${JSON.stringify(m)}`);
    assert.ok(m.emoji?.length, `missing emoji: ${m.text}`);
    assert.equal(typeof m.value, "number", `non-numeric value: ${m.text}`);
    assert.ok(Number.isInteger(m.value), `non-integer value: ${m.text}`);
    assert.ok(m.category?.length, `missing category: ${m.text}`);
    assert.ok("effect" in m, `missing effect key (use null): ${m.text}`);
  }
});

test("modifier text is unique", () => {
  const seen = new Set();
  for (const m of [...MODIFIERS, ...FROG_TRAITS]) {
    assert.ok(!seen.has(m.text), `duplicate modifier: ${m.text}`);
    seen.add(m.text);
  }
});

test("every background is fully specified", () => {
  for (const b of BACKGROUNDS) {
    assert.ok(b.key?.length, `background missing key: ${b.name}`);
    assert.ok(b.emoji?.length, `missing emoji: ${b.name}`);
    assert.ok(b.name?.length, `missing name: ${b.key}`);
    assert.ok(RARITY_ORDER.includes(b.rarity), `bad rarity: ${b.key} -> ${b.rarity}`);
    assert.equal(typeof b.value, "number", `non-numeric value: ${b.key}`);
    assert.ok(Array.isArray(b.sky) && b.sky.length >= 1, `bad sky: ${b.key}`);
    assert.ok(b.effect, `missing effect: ${b.key}`);
  }
});

test("background keys are unique", () => {
  const keys = BACKGROUNDS.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate background key");
});

test("every rarity tier has at least one background to draw from", () => {
  // A weighted rarity with an empty pool would silently fall back to the whole table.
  for (const rarity of RARITY_ORDER) {
    const pool = BACKGROUNDS.filter((b) => b.rarity === rarity);
    assert.ok(pool.length > 0, `no backgrounds for rarity: ${rarity}`);
  }
});

test("every rarity tier has at least one breed to draw from", () => {
  for (const rarity of RARITY_ORDER) {
    const pool = BREEDS.filter((b) => b.rarity === rarity);
    assert.ok(pool.length > 0, `no breeds for rarity: ${rarity}`);
  }
});

test("breed slugs are unique and rarities are known", () => {
  const slugs = BREEDS.map((b) => b.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate breed slug");
  for (const b of BREEDS) {
    assert.ok(RARITY_ORDER.includes(b.rarity), `bad breed rarity: ${b.slug}`);
    assert.ok(b.name?.length, `breed missing name: ${b.slug}`);
  }
});

test("colours are hex strings the canvas can parse", () => {
  const hex = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
  for (const b of BACKGROUNDS) {
    for (const c of b.sky) assert.match(c, hex, `bad sky colour in ${b.key}: ${c}`);
    if (b.ground) assert.match(b.ground, hex, `bad ground colour in ${b.key}: ${b.ground}`);
    for (const p of b.props ?? []) assert.match(p.color, hex, `bad prop colour in ${b.key}: ${p.color}`);
  }
  for (const r of Object.values(RARITIES)) assert.match(r.color, hex, `bad rarity colour: ${r.color}`);
  for (const t of QUALITY_TIERS) assert.match(t.color, hex, `bad tier colour: ${t.color}`);
  assert.match(FROG.color, hex, `bad frog colour: ${FROG.color}`);
});

test("quality tiers ascend and cover every score", () => {
  for (let i = 1; i < QUALITY_TIERS.length; i++) {
    assert.ok(QUALITY_TIERS[i].max > QUALITY_TIERS[i - 1].max, "tier thresholds out of order");
  }
  assert.equal(QUALITY_TIERS.at(-1).max, Infinity, "top tier must be unbounded");
  for (const t of QUALITY_TIERS) assert.ok(t.label?.length, "tier missing label");
});

test("background weights name exactly the known rarities", () => {
  assert.deepEqual(Object.keys(BACKGROUND_WEIGHTS).sort(), [...RARITY_ORDER].sort());
  for (const w of Object.values(BACKGROUND_WEIGHTS)) assert.ok(w > 0, "non-positive weight");
});

test("dog names are unique and non-empty", () => {
  assert.equal(new Set(NAMES).size, NAMES.length, "duplicate dog name");
  for (const n of NAMES) assert.ok(n.trim().length, "blank dog name");
});

test("enough spawnable modifiers to fill the largest dog", () => {
  // sampleDistinct draws without replacement; too small a pool would silently short-change.
  assert.ok(spawnable.length >= 12, `only ${spawnable.length} spawnable modifiers`);
});

test("the frog table is its own world", () => {
  assert.equal(new Set(FROG_NAMES).size, FROG_NAMES.length, "duplicate frog name");
  for (const n of FROG_NAMES) assert.match(n, /^\S.* Frog$/, `not a frog name: ${n}`);
  for (const t of FROG_TRAITS) {
    assert.equal(t.category, "frog", `${t.text} should be in the frog category`);
    assert.ok(!t.group, `${t.text}: frogs don't use groups`);
  }
  assert.ok(FROG_TRAITS.length >= FROG_TRAIT_COUNT_MAX * 3, "too few frog traits to vary");
});

// They're someone else's photos: each one ships with its credit, and nothing ships without.
test("every frog photo is on disk, decodes on the card, and is credited", () => {
  assert.ok(FROG_PHOTOS.length >= 8, "too few frog photos to vary");
  const onDisk = readdirSync("public/frogs").sort();
  assert.deepEqual(FROG_PHOTOS.map((p) => p.file).sort(), onDisk, "public/frogs/ and FROG_PHOTOS disagree");
  for (const p of FROG_PHOTOS) {
    assert.match(p.file, /^[\w-]+\.jpg$/, `bad file name: ${p.file}`);
    assert.ok(p.by?.length, `${p.file}: who took it?`);
    assert.match(p.license, /^(CC0|Public domain|CC BY(-SA)? \d)/, `${p.file}: not an open licence`);
    assert.match(p.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${p.file}: no source page`);
    const bytes = readFileSync(`public/frogs/${p.file}`);
    assert.ok(bytes.byteLength < 200_000, `${p.file} is ${bytes.byteLength}B; keep them small`);
    const img = decodePhoto(bytes);
    assert.ok(img && img.width >= img.height, `${p.file} should decode, landscape`);
  }
});
