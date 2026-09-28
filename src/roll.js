// Deterministic daily roll: the same (player, UTC day) always produces the same dog, so
// refreshing can't reroll, but two friends on the same day get independent pulls.

import { BREEDS, RARITIES, RARITY_ORDER, breedsByRarity, breedValue } from "./breeds.js";
import {
  NAMES, BACKGROUNDS, BACKGROUND_WEIGHTS, MODIFIERS, MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX, QUALITY_TIERS,
  FROG, FROG_CHANCE, FROG_NAMES, FROG_TRAITS, FROG_TRAIT_COUNT_MIN, FROG_TRAIT_COUNT_MAX,
} from "./content/index.js";

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

// Retired modifiers stay in the table so anything still referencing one resolves to its
// text, emoji and effect; they just never land on a new dog.
const SPAWNABLE_MODIFIERS = MODIFIERS.filter((m) => !m.obsolete);

// Some traits sit on the same axis: a dog has one build, one smell, one relationship to
// you. A trait carrying a `group` blocks every other trait in that group, so nothing can
// be Starved and Morbidly obese at once, and the three smells stop stacking into nonsense.
//
// A blocked trait is dropped rather than retried, so the dog still gets its full count --
// the pool is far larger than the number drawn.
function sampleDistinct(rng, arr, count) {
  const pool = arr.slice();
  const out = [];
  const groupsTaken = new Set();

  while (out.length < count && pool.length) {
    const [candidate] = pool.splice(Math.floor(rng() * pool.length), 1);
    if (candidate.group) {
      if (groupsTaken.has(candidate.group)) continue;
      groupsTaken.add(candidate.group);
    }
    out.push(candidate);
  }
  return out;
}

export function qualityFor(score) {
  return QUALITY_TIERS.find((t) => score <= t.max);
}

// The day rolls over at midnight Eastern. Using the IANA zone rather than a fixed -5
// offset means EST/EDT is handled for us instead of drifting an hour each summer.
export const DAY_ZONE = "America/New_York";

export function today(now = new Date()) {
  // en-CA formats as YYYY-MM-DD, which is the key format used everywhere else.
  return new Intl.DateTimeFormat("en-CA", { timeZone: DAY_ZONE }).format(now);
}

// Backgrounds roll their own rarity, so a common breed can still land somewhere absurd.
function pickBackground(rng) {
  const bgRarity = pickRarity(rng, BACKGROUND_WEIGHTS);
  const bgPool = BACKGROUNDS.filter((b) => b.rarity === bgRarity);
  return bgPool.length ? pick(rng, bgPool) : pick(rng, BACKGROUNDS);
}

const pickCount = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

// A frog is decided by its own hash rather than the dog's generator, so frogs arriving
// didn't re-deal a single day that stayed a dog. See content/frogs.js.
export function isFrogDay(playerId, dateStr) {
  return mulberry32(hashString(`frog:${playerId}:${dateStr}`))() < FROG_CHANCE;
}

// `frog` overrides the day's own answer, for /dev and the preview scripts.
export function rollDailyDog(playerId, dateStr = today(), { frog = isFrogDay(playerId, dateStr) } = {}) {
  const rng = mulberry32(hashString(`${playerId}:${dateStr}`));
  if (frog) return rollFrog(rng, dateStr);

  const breedRarity = pickRarity(rng, BREED_WEIGHTS);
  const pool = breedsByRarity(breedRarity);
  const breed = pool.length ? pick(rng, pool) : pick(rng, BREEDS);
  const background = pickBackground(rng);

  const name = pick(rng, NAMES);
  const modifierCount = pickCount(rng, MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX);
  const modifiers = sampleDistinct(rng, SPAWNABLE_MODIFIERS, modifierCount);
  const rarity = RARITIES[breed.rarity];

  return dealt(dateStr, {
    name,
    breed: breed.name,
    breedSlug: breed.slug,
    rarity: breed.rarity,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
    rarityGlow: rarity.glow,
    breedValue: breedValue(breed),
  }, background, modifiers);
}

// No breed, no photo, and its own traits. The scene is the one thing it shares with dogs.
function rollFrog(rng, dateStr) {
  const background = pickBackground(rng);
  const name = pick(rng, FROG_NAMES);
  const count = pickCount(rng, FROG_TRAIT_COUNT_MIN, FROG_TRAIT_COUNT_MAX);
  const traits = sampleDistinct(rng, FROG_TRAITS, count);

  return dealt(dateStr, {
    frog: true,
    name,
    breed: FROG.breed,
    breedSlug: null, // nothing to look up: Dog CEO has no frogs, thankfully
    rarity: "frog",
    rarityLabel: FROG.label,
    rarityColor: FROG.color,
    rarityGlow: FROG.glow,
    breedValue: FROG.value,
  }, background, traits);
}

function dealt(dateStr, animal, background, modifiers) {
  const score =
    animal.breedValue + background.value + modifiers.reduce((sum, m) => sum + m.value, 0);
  const quality = qualityFor(score);

  return {
    date: dateStr,
    ...animal,
    background: {
      key: background.key,
      emoji: background.emoji,
      name: background.name,
      rarity: background.rarity,
      rarityLabel: RARITIES[background.rarity].label,
      value: background.value,
      sky: background.sky,
      ground: background.ground,
      props: background.props ?? [],
      effect: background.effect,
    },
    modifiers: modifiers.map((m) => ({
      text: m.text,
      emoji: m.emoji,
      value: m.value,
      category: m.category,
      // Only when it has one, so a stored dog doesn't carry a field full of nulls.
      ...(m.group ? { group: m.group } : {}),
      effect: m.effect,
    })),
    score,
    qualityLabel: quality.label,
    qualityColor: quality.color,
    qualityEmoji: quality.emoji,
  };
}
