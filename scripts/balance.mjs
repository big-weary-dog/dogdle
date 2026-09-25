// The balance report: where the average dog sits, how the tiers fill, and -- when the mean
// has drifted -- which traits to nudge to bring it back. Report only; it edits nothing.
//
//   node scripts/balance.mjs
//
// The test suite fails once the average dog drifts past +/-0.5. The fix is always the same
// shape: move traits one point each, spread across distinct ungrouped traits, so the
// extremes keep their drama. The candidates printed at the bottom follow that rule, from
// both the negative and the positive band.

import { rollDailyDog } from "../src/roll.js";
import {
  MODIFIERS, BACKGROUNDS, BACKGROUND_WEIGHTS, QUALITY_TIERS,
  MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX,
} from "../src/content/index.js";

const SAMPLE = 20000;
const dogs = Array.from({ length: SAMPLE }, (_, i) => rollDailyDog(`balance-${i}`, "2026-09-19"));
const scores = dogs.map((d) => d.score).sort((a, b) => a - b);
const mean = scores.reduce((a, b) => a + b, 0) / SAMPLE;
const median = scores[Math.floor(SAMPLE / 2)];

// What each part contributes, measured on the same dogs.
const avg = (f) => dogs.reduce((sum, d) => sum + f(d), 0) / SAMPLE;
const parts = {
  breed: avg((d) => d.breedValue),
  background: avg((d) => d.background.value),
  traits: avg((d) => d.modifiers.reduce((s, m) => s + m.value, 0)),
};

const pct = (n) => `${((100 * n) / SAMPLE).toFixed(1)}%`;
console.log(`average dog  ${mean.toFixed(3)}   (test fails outside +/-0.5)`);
console.log(`median       ${median}`);
console.log(`range        ${scores[0]} .. ${scores.at(-1)}`);
console.log(`parts        breed ${parts.breed.toFixed(2)}, background ${parts.background.toFixed(2)}, traits ${parts.traits.toFixed(2)}`);

const width = Math.max(...QUALITY_TIERS.map((t) => t.label.length));
console.log("\ntiers");
for (const tier of QUALITY_TIERS) {
  const n = dogs.filter((d) => d.qualityLabel === tier.label).length;
  console.log(`  ${tier.emoji} ${tier.label.padEnd(width)} ${pct(n).padStart(6)}`);
}

// Background pool means, by rarity, since backgrounds are the lopsided part on purpose.
const wTotal = Object.values(BACKGROUND_WEIGHTS).reduce((a, b) => a + b, 0);
console.log("\nbackgrounds (weight, count, mean value)");
for (const [rarity, w] of Object.entries(BACKGROUND_WEIGHTS)) {
  const pool = BACKGROUNDS.filter((b) => b.rarity === rarity);
  const m = pool.reduce((s, b) => s + b.value, 0) / (pool.length || 1);
  console.log(`  ${rarity.padEnd(10)} ${pct((SAMPLE * w) / wTotal).padStart(6)}  ${String(pool.length).padStart(3)}  ${m >= 0 ? "+" : ""}${m.toFixed(2)}`);
}

const spawn = MODIFIERS.filter((m) => !m.obsolete);
const traitMean = spawn.reduce((s, m) => s + m.value, 0) / spawn.length;
console.log(`\ntraits       ${spawn.length} spawnable, mean ${traitMean.toFixed(3)}, ${MODIFIER_COUNT_MIN}-${MODIFIER_COUNT_MAX} per dog`);

// A dog draws a few traits from the pool, so one point on one trait moves the average dog
// by (traits per dog / pool size).
const perPoint = avg((d) => d.modifiers.length) / spawn.length;
const points = Math.round(Math.abs(mean) / perPoint);
console.log(`one point    moves the average dog ~${perPoint.toFixed(4)}`);

if (Math.abs(mean) < 0.15) {
  console.log("\nbalanced -- nothing to correct.");
} else {
  // Both bands move the mean the same way when shifted in the same direction, so a
  // correction can come from either. Split it between them: taking it all from the
  // negatives, batch after batch, keeps hitting the same traits and makes the bad end
  // harsher every time. Grouped traits are left alone: their effect on the mean depends
  // on what they block.
  const high = mean > 0;
  const step = high ? -1 : 1;
  const band = (lo, hi) =>
    spawn
      .filter((m) => !m.group && m.value >= lo && m.value <= hi)
      .sort((a, b) => (high ? b.value - a.value : a.value - b.value) || a.text.localeCompare(b.text));
  const negatives = band(-4, -2);
  const positives = band(3, 5);

  console.log(`\naverage is ${high ? "high" : "low"}: move ~${points} traits one point ${high ? "down" : "up"}, split across both bands.`);
  console.log("Prefer traits the last correction didn't touch (git log -p src/content/traits).");
  for (const [label, list] of [["negatives, -4..-2", negatives], ["positives, +3..+5", positives]]) {
    console.log(`\n  ${label} (${list.length} available)`);
    for (const m of list) {
      console.log(`    ${String(m.value).padStart(3)} -> ${String(m.value + step).padStart(3)}  ${m.text}`);
    }
  }
  if (negatives.length + positives.length < points) console.log("\n  (not enough ungrouped candidates -- widen a band)");
}
