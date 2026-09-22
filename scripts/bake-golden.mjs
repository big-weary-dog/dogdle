// Records the two things a content refactor can silently break:
//
//   test/content-inventory.json  every background, trait, name and tier, in a canonical
//                                order -- so moving them between files is provably lossless
//   test/golden.json             the dogs sixteen fixed seeds produce -- so the generator
//                                itself is pinned
//
// Re-run it only when a change is meant to alter one of those, and read the diff it makes:
//
//   node scripts/bake-golden.mjs

import { writeFileSync } from "fs";
import { rollDailyDog } from "../src/roll.js";
import {
  NAMES, BACKGROUNDS, BACKGROUND_WEIGHTS, MODIFIERS,
  MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX, QUALITY_TIERS,
} from "../src/content.js";
import { SEEDS } from "../test/golden-seeds.js";

const by = (key) => (a, b) => String(a[key]).localeCompare(String(b[key]));

const inventory = {
  weights: BACKGROUND_WEIGHTS,
  modifierCount: { min: MODIFIER_COUNT_MIN, max: MODIFIER_COUNT_MAX },
  // Infinity doesn't survive JSON, and it's the last tier's whole point.
  tiers: QUALITY_TIERS.map((t) => ({ ...t, max: t.max === Infinity ? "Infinity" : t.max })),
  names: [...NAMES].sort(),
  backgrounds: [...BACKGROUNDS].sort(by("key")),
  modifiers: [...MODIFIERS].sort(by("text")),
};

writeFileSync("test/content-inventory.json", JSON.stringify(inventory, null, 1) + "\n");
console.log(
  `inventory: ${inventory.names.length} names, ${inventory.backgrounds.length} backgrounds, ` +
    `${inventory.modifiers.length} traits`
);

const dogs = SEEDS.map(([player, date]) => rollDailyDog(player, date));
writeFileSync("test/golden.json", JSON.stringify(dogs, null, 1) + "\n");

const scores = dogs.map((d) => d.score);
console.log(`golden: ${dogs.length} dogs, scores ${Math.min(...scores)}..${Math.max(...scores)}`);
