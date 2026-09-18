// Deterministic daily roll: the same (player, UTC day) always produces the same dog, so
// refreshing can't reroll, but two friends on the same day get independent pulls.

import { BREEDS, RARITIES, RARITY_ORDER, breedsByRarity } from "./breeds.js";
import { NAMES, BACKGROUNDS, BACKGROUND_WEIGHTS, MODIFIERS, MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX, QUALITY_TIERS } from "./content.js";

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickRarity(rng, weights) {
  const total = RARITY_ORDER.reduce((sum, key) => sum + weights[key], 0);
  let roll = rng() * total;
  for (const key of RARITY_ORDER) {
    roll -= weights[key];
    if (roll <= 0) return key;
  }
  return "common";
}

const BREED_WEIGHTS = Object.fromEntries(RARITY_ORDER.map((k) => [k, RARITIES[k].weight]));

function sampleDistinct(rng, arr, count) {
  const pool = arr.slice();
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    out.push(...pool.splice(Math.floor(rng() * pool.length), 1));
  }
  return out;
}

function qualityFor(score) {
  return QUALITY_TIERS.find((t) => score <= t.max);
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function rollDailyDog(playerId, dateStr = todayUTC()) {
  const rng = mulberry32(hashString(`${playerId}:${dateStr}`));

  const breedRarity = pickRarity(rng, BREED_WEIGHTS);
  const pool = breedsByRarity(breedRarity);
  const breed = pool.length ? pick(rng, pool) : pick(rng, BREEDS);

  // Backgrounds roll their own rarity, so a common breed can still land somewhere absurd.
  const bgRarity = pickRarity(rng, BACKGROUND_WEIGHTS);
  const bgPool = BACKGROUNDS.filter((b) => b.rarity === bgRarity);
  const background = bgPool.length ? pick(rng, bgPool) : pick(rng, BACKGROUNDS);

  const name = pick(rng, NAMES);
  const span = MODIFIER_COUNT_MAX - MODIFIER_COUNT_MIN + 1;
  const modifierCount = MODIFIER_COUNT_MIN + Math.floor(rng() * span);
  const modifiers = sampleDistinct(rng, MODIFIERS, modifierCount);

  const score = background.value + modifiers.reduce((sum, m) => sum + m.value, 0);
  const quality = qualityFor(score);
  const rarity = RARITIES[breed.rarity];

  return {
    date: dateStr,
    name,
    breed: breed.name,
    breedSlug: breed.slug,
    rarity: breed.rarity,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
    rarityGlow: rarity.glow,
    background: {
      key: background.key,
      emoji: background.emoji,
      name: background.name,
      rarity: background.rarity,
      rarityLabel: RARITIES[background.rarity].label,
      value: background.value,
      sky: background.sky,
      ground: background.ground,
      effect: background.effect,
    },
    modifiers: modifiers.map((m) => ({
      text: m.text,
      emoji: m.emoji,
      value: m.value,
      category: m.category,
      effect: m.effect,
    })),
    score,
    qualityLabel: quality.label,
    qualityColor: quality.color,
  };
}
