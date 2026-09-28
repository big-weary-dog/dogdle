// Behaviour of the generator itself: determinism, structural soundness of a rolled dog,
// and that the content stays balanced around zero.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rollDailyDog, isFrogDay, today, DAY_ZONE } from "../src/roll.js";
import {
  MODIFIERS, QUALITY_TIERS, MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX, FROG, FROG_CHANCE, FROG_TRAITS,
} from "../src/content/index.js";
import { BREEDS, RARITY_VALUE, breedValue } from "../src/breeds.js";

const sample = (n, date = "2026-09-19") =>
  Array.from({ length: n }, (_, i) => rollDailyDog(`test-player-${i}`, date));

test("the same player and date always deals the same dog", () => {
  const a = rollDailyDog("stable-player", "2026-09-19");
  const b = rollDailyDog("stable-player", "2026-09-19");
  assert.deepEqual(a, b);
});

test("a different day deals a different dog", () => {
  const a = rollDailyDog("stable-player", "2026-09-19");
  const b = rollDailyDog("stable-player", "2026-09-20");
  assert.notDeepEqual(a, b);
});

test("different players mostly get different dogs", () => {
  const names = sample(300).map((d) => `${d.name}|${d.breed}|${d.score}`);
  // Collisions are possible; wholesale duplication would mean the seed isn't being used.
  assert.ok(new Set(names).size > 250, `only ${new Set(names).size} distinct dogs in 300`);
});

test("score equals the breed plus the background plus its modifiers, every time", () => {
  for (const dog of sample(500)) {
    const expected =
      dog.breedValue + dog.background.value + dog.modifiers.reduce((sum, m) => sum + m.value, 0);
    assert.equal(dog.score, expected, `score mismatch for ${dog.name}`);
  }
});

test("a breed is worth points only once it's uncommon, and one is worth less than none", () => {
  const value = Object.fromEntries(BREEDS.map((b) => [b.name, breedValue(b)]));

  for (const breed of BREEDS.filter((b) => b.rarity === "common")) {
    assert.equal(value[breed.name], 0, `${breed.name} is common and should be worth nothing`);
  }
  assert.ok(value["Pit Bull Terrier"] < 0, "the pit bull is the negative breed");
  assert.equal(
    BREEDS.filter((b) => breedValue(b) < 0).length,
    1,
    "exactly one breed is worth negative points"
  );

  // Rarer is worth more, all the way up.
  const tiers = ["common", "uncommon", "rare", "epic", "legendary"];
  for (let i = 1; i < tiers.length; i++) {
    assert.ok(RARITY_VALUE[tiers[i]] > RARITY_VALUE[tiers[i - 1]], `${tiers[i]} should beat ${tiers[i - 1]}`);
  }
});

test("a dog never carries two traits from the same group", () => {
  for (const dog of sample(3000)) {
    const groups = dog.modifiers.map((m) => m.group).filter(Boolean);
    assert.equal(
      new Set(groups).size,
      groups.length,
      `${dog.name} got two from the same group: ${groups.join(", ")}`
    );
  }
});

test("a dog still gets its full complement of traits despite the groups", () => {
  for (const dog of sample(1000)) {
    assert.ok(
      dog.modifiers.length >= MODIFIER_COUNT_MIN && dog.modifiers.length <= MODIFIER_COUNT_MAX,
      `${dog.name} got ${dog.modifiers.length} traits`
    );
  }
});

test("every group is a real choice, not a lone trait", () => {
  const counts = {};
  for (const m of MODIFIERS) if (m.group) counts[m.group] = (counts[m.group] || 0) + 1;

  assert.ok(Object.keys(counts).length, "no groups defined at all");
  for (const [group, n] of Object.entries(counts)) {
    assert.ok(n >= 2, `group "${group}" has only ${n} trait, so it excludes nothing`);
  }
});

test("the quality label matches the score's tier", () => {
  for (const dog of sample(500)) {
    const tier = QUALITY_TIERS.find((t) => dog.score <= t.max);
    assert.equal(dog.qualityLabel, tier.label, `wrong tier at score ${dog.score}`);
    assert.equal(dog.qualityColor, tier.color);
  }
});

test("modifier count stays within its declared bounds", () => {
  for (const dog of sample(500)) {
    assert.ok(
      dog.modifiers.length >= MODIFIER_COUNT_MIN && dog.modifiers.length <= MODIFIER_COUNT_MAX,
      `${dog.modifiers.length} modifiers is outside ${MODIFIER_COUNT_MIN}..${MODIFIER_COUNT_MAX}`
    );
  }
});

test("a dog never gets the same modifier twice", () => {
  for (const dog of sample(500)) {
    const texts = dog.modifiers.map((m) => m.text);
    assert.equal(new Set(texts).size, texts.length, `duplicate modifier on ${dog.name}`);
  }
});

test("retired modifiers never spawn", () => {
  const retired = new Set(MODIFIERS.filter((m) => m.obsolete).map((m) => m.text));
  assert.ok(retired.size > 0, "expected at least one retired modifier to guard");
  for (const dog of sample(2000)) {
    for (const m of dog.modifiers) {
      assert.ok(!retired.has(m.text), `retired modifier spawned: ${m.text}`);
    }
  }
});

test("a rolled dog carries everything the client renders", () => {
  for (const dog of sample(100)) {
    for (const key of ["date", "name", "breed", "breedSlug", "rarityLabel", "rarityColor", "score", "qualityLabel"]) {
      assert.ok(dog[key] !== undefined && dog[key] !== "", `missing ${key}`);
    }
    assert.ok(Array.isArray(dog.background.sky), "background sky missing");
    assert.ok(Array.isArray(dog.background.props), "background props should default to an array");
    assert.ok(dog.background.emoji, "background emoji missing");
    for (const m of dog.modifiers) {
      assert.ok(m.emoji, `modifier missing emoji: ${m.text}`);
      assert.ok("effect" in m, `modifier missing effect key: ${m.text}`);
    }
  }
});

test("the average dog scores about zero", () => {
  // Dogs only: a frog is a deliberate tax on top of a balanced dog (content/frogs.js).
  const scores = sample(6000).filter((d) => !d.frog).map((d) => d.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Sampling noise on 6k rolls is well under half a point.
  assert.ok(Math.abs(mean) < 0.5, `average dog scores ${mean.toFixed(3)}, expected ~0`);
});

test("scores spread across the whole ladder", () => {
  const labels = new Set(sample(6000).map((d) => d.qualityLabel));
  // Every tier should be reachable; an unreachable one means a threshold is wrong.
  assert.equal(labels.size, QUALITY_TIERS.length, `only ${labels.size} of ${QUALITY_TIERS.length} tiers reachable`);
});

test("the day boundary is midnight Eastern, across daylight saving", () => {
  assert.equal(DAY_ZONE, "America/New_York");
  // EST is UTC-5, so the day turns at 05:00Z.
  assert.equal(today(new Date("2026-01-15T04:59:00Z")), "2026-01-14");
  assert.equal(today(new Date("2026-01-15T05:01:00Z")), "2026-01-15");
  // EDT is UTC-4, so it turns at 04:00Z.
  assert.equal(today(new Date("2026-07-15T03:59:00Z")), "2026-07-14");
  assert.equal(today(new Date("2026-07-15T04:01:00Z")), "2026-07-15");
});

test("today() returns an ISO date the storage keys accept", () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test("frogs get in now and then, and only on their own day", () => {
  const dogs = sample(8000);
  const frogs = dogs.filter((d) => d.frog);
  const rate = frogs.length / dogs.length;
  assert.ok(Math.abs(rate - FROG_CHANCE) < FROG_CHANCE * 0.35, `frog rate ${rate.toFixed(4)}`);
  dogs.forEach((d, i) => assert.equal(Boolean(d.frog), isFrogDay(`test-player-${i}`, "2026-09-19")));
});

test("a frog is a frog all the way through", () => {
  const dogTraits = new Set(MODIFIERS.map((m) => m.text));
  const frogTraits = new Set(FROG_TRAITS.map((m) => m.text));
  for (let i = 0; i < 300; i++) {
    const frog = rollDailyDog(`frog-${i}`, "2026-09-19", { frog: true });
    assert.equal(frog.frog, true);
    assert.equal(frog.breedSlug, null, "a frog has no photo to look up");
    assert.equal(frog.breedValue, FROG.value);
    assert.match(frog.name, / Frog$/);
    for (const m of frog.modifiers) {
      assert.ok(frogTraits.has(m.text), `${m.text} is not a frog trait`);
      assert.ok(!dogTraits.has(m.text), `${m.text} is also a dog trait`);
    }
  }
  // And the other way: a dog never picks up a frog trait.
  for (const dog of sample(2000).filter((d) => !d.frog)) {
    for (const m of dog.modifiers) assert.ok(!frogTraits.has(m.text), `${dog.name} got ${m.text}`);
  }
});

test("frogs are bad news", () => {
  const scores = Array.from({ length: 2000 }, (_, i) =>
    rollDailyDog(`frog-${i}`, "2026-09-19", { frog: true }).score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  assert.ok(mean < -20, `the average frog scores ${mean.toFixed(1)}`);
  assert.ok(FROG_TRAITS.every((t) => t.value < 0), "every frog trait should cost points");
});

test("forcing a day's answer doesn't change the dog underneath", () => {
  for (let i = 0; i < 200; i++) {
    const day = rollDailyDog(`test-player-${i}`, "2026-09-19");
    if (day.frog) continue;
    assert.deepEqual(rollDailyDog(`test-player-${i}`, "2026-09-19", { frog: false }), day);
  }
});
