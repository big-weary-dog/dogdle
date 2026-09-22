// Records the two things a content refactor can silently break:
//
//   test/content-inventory.json  every background, trait, name and tier, in a canonical
//                                order -- so moving them between files is provably lossless
//   test/golden.json             the choices the generator makes for sixteen fixed seeds
//
// The two don't overlap: the inventory owns what the content *is*, so the golden file
// stores only what was *picked* -- a trait's effect params are pinned once, by the
// inventory, rather than again in every dog that happens to carry it.
//
// Both are written one entry per line, so a changed value is a one-line diff instead of a
// reshuffled block. Re-run only when a change is meant to alter one of them, and read the
// diff it makes:
//
//   node scripts/bake-golden.mjs

import { writeFileSync } from "fs";
import { rollDailyDog } from "../src/roll.js";
import {
  NAMES, BACKGROUNDS, BACKGROUND_WEIGHTS, MODIFIERS,
  MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX, QUALITY_TIERS,
} from "../src/content/index.js";
import { SEEDS } from "../test/golden-seeds.js";

const by = (key) => (a, b) => String(a[key]).localeCompare(String(b[key]));

// One line per entry: readable as a diff, a fraction of the size of pretty-printing.
function serialize(obj) {
  const parts = Object.entries(obj).map(([key, value]) => {
    if (!Array.isArray(value)) return ` ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
    const rows = value.map((v) => `  ${JSON.stringify(v)}`).join(",\n");
    return ` ${JSON.stringify(key)}: [\n${rows}\n ]`;
  });
  return `{\n${parts.join(",\n")}\n}\n`;
}

writeFileSync(
  "test/content-inventory.json",
  serialize({
    weights: BACKGROUND_WEIGHTS,
    modifierCount: { min: MODIFIER_COUNT_MIN, max: MODIFIER_COUNT_MAX },
    // Infinity doesn't survive JSON, and it's the last tier's whole point.
    tiers: QUALITY_TIERS.map((t) => ({ ...t, max: t.max === Infinity ? "Infinity" : t.max })),
    names: [...NAMES].sort(),
    backgrounds: [...BACKGROUNDS].sort(by("key")),
    modifiers: [...MODIFIERS].sort(by("text")),
  })
);
console.log(
  `inventory: ${NAMES.length} names, ${BACKGROUNDS.length} backgrounds, ${MODIFIERS.length} traits`
);

// What the generator chose, not what the content says those choices contain.
const dogs = SEEDS.map(([player, date]) => {
  const dog = rollDailyDog(player, date);
  return {
    seed: `${player} ${date}`,
    name: dog.name,
    breed: dog.breedSlug,
    rarity: dog.rarity,
    breedValue: dog.breedValue,
    background: dog.background.key,
    traits: dog.modifiers.map((m) => m.text),
    score: dog.score,
    quality: dog.qualityLabel,
  };
});

writeFileSync("test/golden.json", serialize({ dogs }));

const scores = dogs.map((d) => d.score);
console.log(`golden: ${dogs.length} dogs, scores ${Math.min(...scores)}..${Math.max(...scores)}`);
