// The content tables and the rendering engine have to agree. An effect type that doesn't
// exist is skipped without complaint, so the trait just quietly has no visual -- exactly
// the kind of bug that survives review.

import { test } from "node:test";
import assert from "node:assert/strict";

import { BACKGROUNDS, MODIFIERS } from "../src/content.js";
import { EFFECT_TYPES, DOM_EFFECTS, SUBJECT_STYLES, subjectStyle } from "../public/effects.js";

const LAYERS = new Set(["back", "front", "subject"]);

const allEffects = [
  ...BACKGROUNDS.map((b) => ({ owner: b.key, effect: b.effect })),
  ...MODIFIERS.filter((m) => m.effect).map((m) => ({ owner: m.text, effect: m.effect })),
];

test("every referenced effect type is one the engine implements", () => {
  for (const { owner, effect } of allEffects) {
    const known =
      EFFECT_TYPES.has(effect.type) || DOM_EFFECTS.has(effect.type) || effect.type in SUBJECT_STYLES;
    assert.ok(known, `unknown effect type "${effect.type}" on ${owner}`);
  }
});

test("every effect declares a layer the renderer understands", () => {
  for (const { owner, effect } of allEffects) {
    assert.ok(LAYERS.has(effect.layer), `bad layer "${effect.layer}" on ${owner}`);
  }
});

test("subject effects are declared on the subject layer, and vice versa", () => {
  for (const { owner, effect } of allEffects) {
    if (effect.type in SUBJECT_STYLES) {
      assert.equal(effect.layer, "subject", `${owner} uses ${effect.type} but isn't on the subject layer`);
    } else {
      assert.notEqual(effect.layer, "subject", `${owner} is on the subject layer but ${effect.type} isn't a subject effect`);
    }
  }
});

test("every effect carries params", () => {
  for (const { owner, effect } of allEffects) {
    assert.equal(typeof effect.params, "object", `missing params on ${owner}`);
    assert.ok(effect.params !== null, `null params on ${owner}`);
  }
});

test("subject styles compose into usable CSS", () => {
  const subjects = MODIFIERS.filter((m) => m.effect?.layer === "subject").map((m) => m.effect);
  assert.ok(subjects.length > 0, "expected some subject effects");

  // Each one alone should produce something the browser can apply.
  for (const effect of subjects) {
    const style = subjectStyle([effect]);
    const produced = style.filter || style.animation || style.opacity;
    assert.ok(produced, `subject effect ${effect.type} produced no CSS`);
    assert.ok(!/undefined|NaN/.test(produced), `subject effect ${effect.type} produced: ${produced}`);
  }

  // And stacking several must not corrupt the filter string.
  const stacked = subjectStyle(subjects.slice(0, 5));
  assert.ok(!/undefined|NaN/.test(stacked.filter), `stacked filter is broken: ${stacked.filter}`);
});

test("background props use shapes the renderer draws", () => {
  const SHAPES = new Set(["rect", "ellipse", "tri", "hills"]);
  for (const b of BACKGROUNDS) {
    for (const p of b.props ?? []) {
      assert.ok(SHAPES.has(p.shape), `unknown prop shape "${p.shape}" in ${b.key}`);
      if (p.shape !== "hills") {
        assert.equal(typeof p.x, "number", `prop missing x in ${b.key}`);
      }
      assert.equal(typeof p.y, "number", `prop missing y in ${b.key}`);
    }
  }
});
