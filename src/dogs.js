// Deterministic daily dog roll: same (player, UTC day) always yields the same dog,
// so refreshing can't re-roll, but two different friends (or days) get independent pulls.
//
// Two independent axes:
//  - breed rarity: how unusual the breed itself is (flavor/collectibility)
//  - dog score: sum of several +/- modifiers, clusters around 0 via CLT -> bell curve of
//    "how good is this particular dog", independent of breed rarity.

export const RARITIES = [
  { key: "common", label: "Common", weight: 55, color: "#9ca3af", glow: "0 0 12px rgba(156,163,175,.6)" },
  { key: "uncommon", label: "Uncommon", weight: 25, color: "#34d399", glow: "0 0 16px rgba(52,211,153,.7)" },
  { key: "rare", label: "Rare", weight: 12, color: "#38bdf8", glow: "0 0 20px rgba(56,189,248,.8)" },
  { key: "epic", label: "Epic", weight: 6, color: "#a78bfa", glow: "0 0 26px rgba(167,139,250,.9)" },
  { key: "legendary", label: "Legendary", weight: 2, color: "#fbbf24", glow: "0 0 34px rgba(251,191,36,1)" },
];

export const BREEDS = {
  common: [
    "Labrador Retriever", "Golden Retriever", "Beagle", "Poodle", "Dachshund",
    "Chihuahua", "Pug", "Boxer", "Shih Tzu", "Cocker Spaniel", "Mutt (Certified Good Boy)",
  ],
  uncommon: [
    "Corgi", "Border Collie", "Australian Shepherd", "Shiba Inu", "Basset Hound",
    "Bernese Mountain Dog", "Greyhound", "Weimaraner", "Vizsla",
  ],
  rare: [
    "Samoyed", "Akita", "Tibetan Mastiff", "Norwegian Lundehund", "Xoloitzcuintli",
    "Otterhound", "Catalburun",
  ],
  epic: [
    "Direwolf Pup (Rescue)", "Nine-Tailed Fox Terrier", "Phantom Greyhound", "Sky Whale Retriever",
  ],
  legendary: [
    "Cerberus (Just One Head Today)", "Cosmic Corgi", "The Moon Howler", "Sir Bark-a-Lot the Eternal",
  ],
};

export const SIZES = ["Teacup", "Small", "Medium", "Large", "Absolute Unit"];
export const COATS = ["Brindle", "Spotted", "Solid", "Merle", "Sable", "Piebald", "Iridescent"];

// Each modifier carries a value in roughly [-5, 5]. A dog rolls several of these and
// the sum (which naturally clusters around 0 by the central limit theorem) becomes its
// "dog score" -- a bell curve of good-dog-ness independent of breed rarity.
export const MODIFIERS = [
  // strongly positive
  { text: "Certified therapy dog", value: 5 },
  { text: "Never met a stranger it didn't love", value: 4 },
  { text: "Perfectly trained recall", value: 4 },
  { text: "World-class snuggler", value: 4 },
  { text: "Saved its owner's life once, no big deal", value: 5 },
  // mildly positive
  { text: "Good with kids", value: 2 },
  { text: "Knows 'sit', 'stay', and 'shake'", value: 2 },
  { text: "Excellent leash manners", value: 2 },
  { text: "Adorable head tilt", value: 1 },
  { text: "Tail never stops wagging", value: 2 },
  { text: "Surprisingly good at fetch", value: 1 },
  { text: "Gets along with cats", value: 2 },
  { text: "Sheds surprisingly little", value: 1 },
  // neutral-ish quirks
  { text: "Sleeps in a weird position", value: 0 },
  { text: "Has a favorite squeaky toy", value: 0 },
  { text: "Named after a food", value: 0 },
  { text: "One ear always up", value: 0 },
  // mildly negative
  { text: "Barks at the vacuum", value: -1 },
  { text: "Steals socks exclusively", value: -1 },
  { text: "Overly confident around squirrels", value: -1 },
  { text: "Howls at sirens", value: -2 },
  { text: "Professional counter-surfer", value: -2 },
  { text: "Zoomies at 3am", value: -1 },
  { text: "Selective hearing during walks", value: -2 },
  { text: "Drools on everything", value: -1 },
  { text: "Digs holes in the yard", value: -2 },
  // strongly negative
  { text: "Ate the couch. The whole couch.", value: -4 },
  { text: "Chases its own tail for hours", value: -3 },
  { text: "Terrified of its own reflection", value: -3 },
  { text: "Banned from the dog park", value: -5 },
  { text: "Once started a raccoon feud that's still ongoing", value: -4 },
  { text: "Growls at the mailman, the doorbell, and the wind", value: -3 },
];

const MODIFIER_COUNT = 4;

export const QUALITY_TIERS = [
  { max: -9, label: "Certified Bad Dog (affectionately)", color: "#f87171" },
  { max: -3, label: "Rough Around the Edges", color: "#fb923c" },
  { max: 3, label: "Solidly Average Good Boy", color: "#facc15" },
  { max: 9, label: "Great Dog", color: "#4ade80" },
  { max: Infinity, label: "Immaculate Good Boy", color: "#22d3ee" },
];

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

function pickWeighted(rng, items, weightFn) {
  const total = items.reduce((sum, item) => sum + weightFn(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weightFn(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Fisher-Yates sample of `count` distinct items, deterministic given rng.
function sampleDistinct(rng, arr, count) {
  const pool = arr.slice();
  const result = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function qualityForScore(score) {
  return QUALITY_TIERS.find((tier) => score <= tier.max);
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function rollDailyDog(playerId, dateStr = todayUTC()) {
  const seed = hashString(`${playerId}:${dateStr}`);
  const rng = mulberry32(seed);

  const rarity = pickWeighted(rng, RARITIES, (r) => r.weight);
  const breed = pick(rng, BREEDS[rarity.key]);
  const size = pick(rng, SIZES);
  const coat = pick(rng, COATS);

  const modifiers = sampleDistinct(rng, MODIFIERS, MODIFIER_COUNT);
  const score = modifiers.reduce((sum, m) => sum + m.value, 0);
  const quality = qualityForScore(score);

  return {
    date: dateStr,
    rarity: rarity.key,
    rarityLabel: rarity.label,
    color: rarity.color,
    glow: rarity.glow,
    breed,
    name: breed,
    size,
    coat,
    modifiers,
    score,
    qualityLabel: quality.label,
    qualityColor: quality.color,
  };
}
