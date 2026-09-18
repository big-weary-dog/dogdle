// Everything that dresses up a dog: its name, the scene it's standing in, and the
// modifiers stacked on top. Backgrounds and modifiers both contribute to the dog score.
//
// Every visual is described declaratively as { type, params } and rendered by the canvas
// effect engine in public/effects.js -- there are ~14 distinct effect types, each heavily
// parameterized so two modifiers sharing a type still look clearly different.

export const NAMES = [
  "Bailey", "Maple", "Kevin", "Biscuit", "Pickle", "Waffles", "Moose", "Nugget",
  "Olive", "Bruno", "Daisy", "Tank", "Pepper", "Gus", "Luna", "Bean",
  "Rufus", "Mochi", "Cooper", "Noodle", "Winston", "Sadie", "Bagel", "Hazel",
  "Diesel", "Peanut", "Murphy", "Willow", "Otis", "Juniper", "Chico", "Banjo",
  "Roscoe", "Clementine", "Barkley", "Ziggy", "Poppy", "Duke", "Marbles", "Scout",
  "Gravy", "Tofu", "Archie", "Pumpkin", "Wanda", "Bandit", "Cheeto", "Sprout",
  "Doug", "Pretzel", "Ramona", "Chunk", "Sasha", "Meatball", "Frankie", "Butters",
  "Mortimer", "Zelda", "Beans", "Hank", "Pancake", "Greta", "Tater", "Jellybean",
  "Wendell", "Cinnamon", "Bosco", "Fig", "Rupert", "Marlowe", "Kiwi", "Turnip",
  "Gizmo", "Clover", "Sheldon", "Dumpling", "Enzo", "Birdie", "Chowder", "Mabel",
];

// ---------------------------------------------------------------------------
// Backgrounds -- every dog has exactly one. Rarer scenes swing the score harder.
// ---------------------------------------------------------------------------

export const BACKGROUNDS = [
  // common
  {
    key: "backyard", name: "The Backyard", rarity: "common", value: 0,
    sky: ["#7dd3fc", "#bae6fd"], ground: "#4d7c0f",
    effect: { type: "fall", params: { color: "#a3e635", shape: "leaf", count: 14, speed: 0.35, sway: 1.2, size: 5 } },
  },
  {
    key: "couch", name: "The Couch Throne", rarity: "common", value: 1,
    sky: ["#78350f", "#b45309"], ground: "#57534e",
    effect: { type: "fall", params: { color: "#fde68a", shape: "dot", count: 10, speed: 0.15, sway: 2, size: 2 } },
  },
  {
    key: "kitchen", name: "Kitchen Floor (Crumb Zone)", rarity: "common", value: 0,
    sky: ["#e7e5e4", "#a8a29e"], ground: "#d6d3d1",
    effect: { type: "fall", params: { color: "#d97706", shape: "square", count: 8, speed: 0.5, sway: 0.4, size: 3 } },
  },
  {
    key: "dogpark", name: "The Dog Park", rarity: "common", value: 2,
    sky: ["#60a5fa", "#a7f3d0"], ground: "#65a30d",
    effect: { type: "orbit", params: { emoji: "🎾", count: 3, radius: 78, speed: 0.7, size: 16 } },
  },
  {
    key: "sidewalk", name: "A Perfectly Normal Sidewalk", rarity: "common", value: -1,
    sky: ["#94a3b8", "#cbd5e1"], ground: "#64748b",
    effect: { type: "fog", params: { color: "#cbd5e1", bands: 2, opacity: 0.18, speed: 0.25 } },
  },
  {
    key: "backseat", name: "Back Seat of the Car", rarity: "common", value: 1,
    sky: ["#1e3a5f", "#3b82f6"], ground: "#334155",
    effect: { type: "fall", params: { color: "#93c5fd", shape: "line", count: 24, speed: 2.6, sway: 0, size: 9, angle: 0.3 } },
  },

  // uncommon
  {
    key: "beach", name: "Sunset Beach", rarity: "uncommon", value: 3,
    sky: ["#fb923c", "#fcd34d"], ground: "#fde68a",
    effect: { type: "ripple", params: { color: "#fbbf24", rings: 3, speed: 0.55, maxRadius: 150 } },
  },
  {
    key: "forest", name: "Forest Trail", rarity: "uncommon", value: 2,
    sky: ["#14532d", "#4ade80"], ground: "#166534",
    effect: { type: "rays", params: { color: "#bbf7d0", beams: 6, opacity: 0.22, speed: 0.12 } },
  },
  {
    key: "snow", name: "Snowy Field", rarity: "uncommon", value: 2,
    sky: ["#475569", "#e2e8f0"], ground: "#f1f5f9",
    effect: { type: "fall", params: { color: "#ffffff", shape: "dot", count: 90, speed: 0.8, sway: 1.6, size: 2.5 } },
  },
  {
    key: "farm", name: "The Farm", rarity: "uncommon", value: 1,
    sky: ["#fbbf24", "#fef3c7"], ground: "#a16207",
    effect: { type: "fall", params: { color: "#fde047", shape: "line", count: 18, speed: 0.4, sway: 2.4, size: 6, angle: 0.5 } },
  },
  {
    key: "dock", name: "Lake Dock at Dawn", rarity: "uncommon", value: 3,
    sky: ["#7dd3fc", "#fbcfe8"], ground: "#0369a1",
    effect: { type: "fog", params: { color: "#e0f2fe", bands: 3, opacity: 0.3, speed: 0.18 } },
  },
  {
    key: "autumn", name: "Autumn Park", rarity: "uncommon", value: 3,
    sky: ["#ea580c", "#fed7aa"], ground: "#7c2d12",
    effect: { type: "fall", params: { color: "#f97316", shape: "leaf", count: 34, speed: 0.6, sway: 2.8, size: 7 } },
  },

  // rare
  {
    key: "summit", name: "Mountain Summit", rarity: "rare", value: 5,
    sky: ["#1e293b", "#7dd3fc"], ground: "#e2e8f0",
    effect: { type: "rays", params: { color: "#fef08a", beams: 10, opacity: 0.3, speed: 0.08 } },
  },
  {
    key: "storm", name: "Rolling Thunderstorm", rarity: "rare", value: -2,
    sky: ["#1e1b4b", "#475569"], ground: "#0f172a",
    effect: { type: "lightning", params: { color: "#e0e7ff", frequency: 0.012, bolts: 2 } },
  },
  {
    key: "neon", name: "Neon City Alley", rarity: "rare", value: 4,
    sky: ["#2e1065", "#db2777"], ground: "#18181b",
    effect: { type: "glitch", params: { color: "#f0abfc", intensity: 0.5, scanlines: true } },
  },
  {
    key: "blossom", name: "Cherry Blossom Grove", rarity: "rare", value: 6,
    sky: ["#fbcfe8", "#fce7f3"], ground: "#be185d",
    effect: { type: "fall", params: { color: "#f9a8d4", shape: "petal", count: 46, speed: 0.5, sway: 3.2, size: 5 } },
  },
  {
    key: "meadownight", name: "Firefly Meadow", rarity: "rare", value: 5,
    sky: ["#052e16", "#166534"], ground: "#14532d",
    effect: { type: "rise", params: { color: "#fde047", count: 30, speed: 0.35, sway: 2.2, size: 3, glow: true } },
  },

  // epic
  {
    key: "underwater", name: "Somehow, Underwater", rarity: "epic", value: 4,
    sky: ["#0c4a6e", "#0ea5e9"], ground: "#075985",
    effect: { type: "rise", params: { color: "#bae6fd", count: 40, speed: 0.6, sway: 1.4, size: 4, glow: false, hollow: true } },
  },
  {
    key: "volcano", name: "Volcano Rim", rarity: "epic", value: -3,
    sky: ["#450a0a", "#dc2626"], ground: "#1c1917",
    effect: { type: "rise", params: { color: "#fb923c", count: 44, speed: 1.1, sway: 2.6, size: 3, glow: true } },
  },
  {
    key: "aurora", name: "Aurora Tundra", rarity: "epic", value: 8,
    sky: ["#0f172a", "#134e4a"], ground: "#e2e8f0",
    effect: { type: "aurora", params: { colors: ["#34d399", "#22d3ee", "#a78bfa"], bands: 3, speed: 0.22 } },
  },
  {
    key: "graveyard", name: "Haunted Graveyard", rarity: "epic", value: -5,
    sky: ["#111827", "#4c1d95"], ground: "#1f2937",
    effect: { type: "fog", params: { color: "#a78bfa", bands: 4, opacity: 0.26, speed: 0.4 } },
  },

  // legendary
  {
    key: "void", name: "The Void", rarity: "legendary", value: -8,
    sky: ["#000000", "#1c1917"], ground: "#000000",
    effect: { type: "glitch", params: { color: "#dc2626", intensity: 0.9, scanlines: true, tear: true } },
  },
  {
    key: "nebula", name: "Cosmic Nebula", rarity: "legendary", value: 10,
    sky: ["#1e1b4b", "#7e22ce"], ground: "#312e81",
    effect: { type: "stars", params: { color: "#ffffff", count: 130, twinkle: 0.85, nebula: "#a855f7" } },
  },
  {
    key: "heaven", name: "Heaven's Waiting Room", rarity: "legendary", value: 12,
    sky: ["#fef9c3", "#fefce8"], ground: "#fde68a",
    effect: { type: "rays", params: { color: "#fef08a", beams: 14, opacity: 0.45, speed: 0.05, holy: true } },
  },
  {
    key: "dreamscape", name: "Someone Else's Dream", rarity: "legendary", value: 6,
    sky: ["#7e22ce", "#f0abfc"], ground: "#c026d3",
    effect: { type: "ripple", params: { color: "#f5d0fe", rings: 5, speed: 0.9, maxRadius: 220, warp: true } },
  },
];

// ---------------------------------------------------------------------------
// Modifiers -- a dog rolls several. Values sum (with the background) into the score,
// which clusters on a bell curve via the central limit theorem.
// ---------------------------------------------------------------------------

export const MODIFIERS = [
  // ===== temperament: strongly positive =====
  { text: "Certified therapy dog", value: 5, category: "temperament",
    effect: { type: "pulse", params: { color: "#4ade80", period: 2600, radius: 190 } } },
  { text: "Never met a stranger it didn't love", value: 4, category: "temperament",
    effect: { type: "rise", params: { color: "#fb7185", count: 16, speed: 0.5, sway: 1.8, size: 7, shape: "heart" } } },
  { text: "Perfect recall, every single time", value: 4, category: "temperament",
    effect: { type: "pulse", params: { color: "#38bdf8", period: 1700, radius: 140 } } },
  { text: "World-class snuggler", value: 4, category: "temperament",
    effect: { type: "rise", params: { color: "#f472b6", count: 22, speed: 0.34, sway: 2.4, size: 8, shape: "heart" } } },
  { text: "Pulled someone out of a lake once", value: 5, category: "temperament",
    effect: { type: "rays", params: { color: "#7dd3fc", beams: 8, opacity: 0.3, speed: 0.15 } } },

  // ===== temperament: mild =====
  { text: "Good with kids", value: 2, category: "temperament",
    effect: { type: "burst", params: { color: "#fbbf24", count: 26, spread: 130 } } },
  { text: "Gets along with cats, suspiciously well", value: 2, category: "temperament",
    effect: { type: "orbit", params: { emoji: "🐈", count: 2, radius: 86, speed: 0.5, size: 15 } } },
  { text: "Excellent leash manners", value: 2, category: "temperament",
    effect: { type: "vignette", params: { color: "#0ea5e9", opacity: 0.35 } } },
  { text: "Knows 'sit', 'stay', and one secret third thing", value: 2, category: "temperament",
    effect: { type: "spotlight", params: { color: "#fef08a", radius: 110, speed: 0.4 } } },

  // ===== temperament: negative =====
  { text: "Selective hearing during walks", value: -2, category: "temperament",
    effect: { type: "vignette", params: { color: "#57534e", opacity: 0.45 } } },
  { text: "Growls at the mailman, the doorbell, and the wind", value: -3, category: "temperament",
    effect: { type: "shake", params: { intensity: 3, period: 900 } } },
  { text: "Banned from the dog park", value: -5, category: "temperament",
    effect: { type: "glitch", params: { color: "#ef4444", intensity: 0.7, scanlines: false } } },
  { text: "Started a raccoon feud that is still ongoing", value: -4, category: "temperament",
    effect: { type: "orbit", params: { emoji: "🦝", count: 3, radius: 92, speed: 1.3, size: 16 } } },
  { text: "Terrified of its own reflection", value: -3, category: "temperament",
    effect: { type: "glitch", params: { color: "#818cf8", intensity: 0.4, scanlines: false } } },

  // ===== quirk: neutral-ish flavor =====
  { text: "Sleeps in an anatomically concerning position", value: 0, category: "quirk", effect: null },
  { text: "Has one favorite squeaky toy and no others", value: 0, category: "quirk",
    effect: { type: "orbit", params: { emoji: "🧸", count: 1, radius: 70, speed: 0.9, size: 15 } } },
  { text: "One ear permanently up", value: 0, category: "quirk", effect: null },
  { text: "Screams instead of barking", value: 0, category: "quirk",
    effect: { type: "ripple", params: { color: "#fca5a5", rings: 4, speed: 1.4, maxRadius: 170 } } },
  { text: "Convinced it is a lap dog. It is not.", value: 1, category: "quirk", effect: null },

  // ===== quirk: negative =====
  { text: "Zoomies at 3am, nightly", value: -1, category: "quirk",
    effect: { type: "shake", params: { intensity: 5, period: 260 } } },
  { text: "Professional counter-surfer", value: -2, category: "quirk",
    effect: { type: "orbit", params: { emoji: "🥩", count: 2, radius: 80, speed: 1.1, size: 15 } } },
  { text: "Steals socks. Only socks.", value: -1, category: "quirk",
    effect: { type: "orbit", params: { emoji: "🧦", count: 4, radius: 88, speed: 0.8, size: 14 } } },
  { text: "Digs holes with structural consequences", value: -2, category: "quirk",
    effect: { type: "fall", params: { color: "#92400e", shape: "square", count: 26, speed: 1.2, sway: 0.6, size: 4 } } },
  { text: "Howls at every passing siren", value: -2, category: "quirk",
    effect: { type: "ripple", params: { color: "#60a5fa", rings: 3, speed: 1.1, maxRadius: 190 } } },
  { text: "Ate the couch. The entire couch.", value: -4, category: "quirk",
    effect: { type: "burst", params: { color: "#a16207", count: 40, spread: 190, debris: true } } },
  { text: "Chases its own tail for hours at a time", value: -3, category: "quirk",
    effect: { type: "orbit", params: { emoji: "💫", count: 5, radius: 64, speed: 2.4, size: 13 } } },

  // ===== accessory =====
  { text: "Wearing a tiny hat, with dignity", value: 3, category: "accessory",
    effect: { type: "orbit", params: { emoji: "🎩", count: 1, radius: 74, speed: 0.6, size: 17 } } },
  { text: "Bandana. Very cool bandana.", value: 2, category: "accessory",
    effect: { type: "burst", params: { color: "#f87171", count: 18, spread: 110 } } },
  { text: "Sunglasses (indoor use only)", value: 2, category: "accessory",
    effect: { type: "spotlight", params: { color: "#fde047", radius: 130, speed: 0.7 } } },
  { text: "Cone of shame", value: -3, category: "accessory",
    effect: { type: "fog", params: { color: "#94a3b8", bands: 2, opacity: 0.32, speed: 0.5 } } },
  { text: "Sweater knitted by someone who loves it", value: 3, category: "accessory",
    effect: { type: "fall", params: { color: "#fda4af", shape: "dot", count: 20, speed: 0.3, sway: 2, size: 3 } } },
  { text: "Muddy. Catastrophically muddy.", value: -2, category: "accessory",
    effect: { type: "fall", params: { color: "#78350f", shape: "dot", count: 36, speed: 1.4, sway: 1, size: 3.5 } } },

  // ===== aura: rare, big swings =====
  { text: "Faintly glowing for unexplained reasons", value: 4, category: "aura",
    effect: { type: "pulse", params: { color: "#22d3ee", period: 1400, radius: 210, strong: true } } },
  { text: "Blessed by something ancient", value: 6, category: "aura",
    effect: { type: "rays", params: { color: "#fcd34d", beams: 12, opacity: 0.42, speed: 0.1, holy: true } } },
  { text: "Followed home by exactly one crow", value: -1, category: "aura",
    effect: { type: "orbit", params: { emoji: "🐦‍⬛", count: 1, radius: 96, speed: 0.75, size: 15 } } },
  { text: "Slightly out of sync with reality", value: -4, category: "aura",
    effect: { type: "glitch", params: { color: "#c084fc", intensity: 0.85, scanlines: true, tear: true } } },
  { text: "Surrounded by an unreasonable number of bees", value: -3, category: "aura",
    effect: { type: "orbit", params: { emoji: "🐝", count: 6, radius: 100, speed: 2.1, size: 12 } } },
  { text: "Smells faintly of cinnamon", value: 2, category: "aura",
    effect: { type: "rise", params: { color: "#d97706", count: 18, speed: 0.4, sway: 2.6, size: 3, glow: true } } },
  { text: "Actively being haunted", value: -5, category: "aura",
    effect: { type: "fog", params: { color: "#c4b5fd", bands: 4, opacity: 0.34, speed: 0.6 } } },
  { text: "Statistically the luckiest dog alive", value: 5, category: "aura",
    effect: { type: "burst", params: { color: "#4ade80", count: 44, spread: 200, confetti: true } } },
];

export const MODIFIER_COUNT = 3;

// Thresholds sit on the measured percentiles of the score distribution (~5/20/60/15/5),
// so "average" really is average and the top and bottom tiers stay rare.
export const QUALITY_TIERS = [
  { max: -8, label: "Certified Problem Dog", color: "#f87171" },
  { max: -3, label: "Rough Around the Edges", color: "#fb923c" },
  { max: 6, label: "Solidly Average Good Boy", color: "#facc15" },
  { max: 11, label: "Genuinely Great Dog", color: "#4ade80" },
  { max: Infinity, label: "Immaculate, Beyond Reproach", color: "#22d3ee" },
];
