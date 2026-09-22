// A frozen record of what the generator produces for fixed seeds.
//
// The other suites check properties -- scores add up, tiers are right, retired traits
// don't spawn. This one checks something they can't: that a change nobody meant to make
// didn't happen. Moving the content tables around, reordering a list, renaming a field:
// all of it is invisible to a property test and all of it re-deals every future dog.
//
// A failure here is not automatically a bug. It means the generator's output moved, and
// the diff has to be looked at and either fixed or, if the change was the point, re-baked
// with `node scripts/bake-golden.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { rollDailyDog } from "../src/roll.js";
import { SEEDS } from "./golden-seeds.js";

const golden = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url)));

test("the golden file covers every seed", () => {
  assert.equal(golden.length, SEEDS.length);
});

test("fixed seeds still produce the exact same dogs", () => {
  SEEDS.forEach(([player, date], i) => {
    const dog = rollDailyDog(player, date);
    const was = golden[i];

    // Compared field by field, because a whole-object diff on a dog with eight traits and
    // their effect specs is unreadable in a test failure.
    assert.equal(dog.name, was.name, `${player}: name`);
    assert.equal(dog.breed, was.breed, `${player}: breed`);
    assert.equal(dog.breedSlug, was.breedSlug, `${player}: breed slug`);
    assert.equal(dog.rarity, was.rarity, `${player}: rarity`);
    assert.equal(dog.score, was.score, `${player}: score`);
    assert.equal(dog.qualityLabel, was.qualityLabel, `${player}: tier`);
    assert.equal(dog.background.key, was.background.key, `${player}: background`);
    assert.deepEqual(
      dog.modifiers.map((m) => m.text),
      was.modifiers.map((m) => m.text),
      `${player}: traits`
    );

    // And then the whole thing, so effect params and values are covered too.
    assert.deepEqual(dog, was, `${player}: full dog`);
  });
});
