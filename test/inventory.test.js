// The content tables, pinned in a canonical order.
//
// This exists so the tables can be moved between files freely: the order things appear in
// a source file is invisible here, but losing a trait, mistyping a value, or dropping an
// effect param while cutting and pasting is not.
//
// It is a snapshot, so a deliberate content change fails it. Re-bake with
// `node scripts/bake-golden.mjs` and the diff is the review.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  NAMES, BACKGROUNDS, BACKGROUND_WEIGHTS, MODIFIERS,
  MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX, QUALITY_TIERS,
  FROG, FROG_CHANCE, FROG_NAMES, FROG_TRAITS, FROG_TRAIT_COUNT_MIN, FROG_TRAIT_COUNT_MAX, SEASONS,
} from "../src/content/index.js";

const was = JSON.parse(readFileSync(new URL("./content-inventory.json", import.meta.url)));
const by = (key) => (a, b) => String(a[key]).localeCompare(String(b[key]));
// A season's dials, with its dates for a few years: the dates are functions in the source.
const seasonal = (s) => ({
  ...s, date: undefined, dates: [2026, 2027, 2028].map((y) => s.date(y) ?? null),
  traits: [...s.traits].sort(by("text")), backgrounds: [...s.backgrounds].sort(by("key")),
});

test("every name survived", () => {
  assert.deepEqual([...NAMES].sort(), was.names);
});

test("every background survived, with its effect intact", () => {
  assert.deepEqual([...BACKGROUNDS].sort(by("key")), was.backgrounds);
});

test("every trait survived, with its value, category and effect intact", () => {
  assert.deepEqual([...MODIFIERS].sort(by("text")), was.modifiers);
});

test("every frog survived, and so did the odds of one", () => {
  assert.deepEqual([...FROG_NAMES].sort(), was.frogNames);
  assert.deepEqual([...FROG_TRAITS].sort(by("text")), was.frogTraits);
  assert.deepEqual(
    { ...FROG, chance: FROG_CHANCE, traitCount: { min: FROG_TRAIT_COUNT_MIN, max: FROG_TRAIT_COUNT_MAX } },
    was.frog
  );
});

test("every season survived, with its dates, traits and places", () => {
  // Through JSON, as the snapshot was: that's what drops the date function.
  assert.deepEqual(JSON.parse(JSON.stringify(SEASONS.map(seasonal))), was.seasons);
});

test("the dials around them are unchanged", () => {
  assert.deepEqual(BACKGROUND_WEIGHTS, was.weights);
  assert.deepEqual({ min: MODIFIER_COUNT_MIN, max: MODIFIER_COUNT_MAX }, was.modifierCount);
  assert.deepEqual(
    QUALITY_TIERS.map((t) => ({ ...t, max: t.max === Infinity ? "Infinity" : t.max })),
    was.tiers
  );
});
