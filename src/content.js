// Everything that dresses up a dog: its name, the scene it's standing in, and the
// modifiers stacked on top. Backgrounds and modifiers both feed the dog score.
//
// Tone: plain and dry. "Has malaria", not "cursed by ancient forces". The comedy is in
// stating a grim or absurd fact flatly next to a number.
//
// Visuals are declarative -- { type, layer, params } -- rendered by public/effects.js.
// The layer decides where an effect sits, which is what gives a scene any depth:
//   back    -- the world behind the dog
//   front   -- stuff between you and the dog
//   subject -- CSS on the photo itself, so the effect visibly touches the animal

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
  "Todd", "Linda", "Gary", "Deborah", "Kyle", "Brenda", "Steve", "Carol",
];

// Backgrounds roll on their own weights, deliberately much flatter than the breed table:
// a boring common scene should turn up about 30% of the time, not half.
export const BACKGROUND_WEIGHTS = {
  common: 30,
  uncommon: 28,
  rare: 22,
  epic: 15,
  legendary: 5,
};

export const BACKGROUNDS = [
  // ---------------- common: mundane places a dog is actually in ----------------
  {
    key: "backyard", name: "A Backyard", rarity: "common", value: 0,
    sky: ["#7dd3fc", "#bae6fd"], ground: "#4d7c0f",
    effect: { type: "fall", layer: "front", params: { color: "#a3e635", shape: "leaf", count: 30, speed: 0.4, sway: 2, size: 8 } },
  },
  {
    key: "couch", name: "The Couch", rarity: "common", value: 1,
    sky: ["#7c2d12", "#b45309"], ground: "#57534e",
    effect: { type: "fall", layer: "front", params: { color: "#fde68a", shape: "dot", count: 26, speed: 0.12, sway: 3, size: 3 } },
  },
  {
    key: "kitchen", name: "The Kitchen Floor", rarity: "common", value: 0,
    sky: ["#d6d3d1", "#a8a29e"], ground: "#e7e5e4",
    effect: { type: "fall", layer: "front", params: { color: "#b45309", shape: "square", count: 24, speed: 0.6, sway: 0.5, size: 4 } },
  },
  {
    key: "dogpark", name: "The Dog Park", rarity: "common", value: 2,
    sky: ["#60a5fa", "#a7f3d0"], ground: "#65a30d",
    effect: { type: "orbit", layer: "front", params: { emoji: "🎾", count: 3, radius: 82, speed: 0.7, size: 20 } },
  },
  {
    key: "sidewalk", name: "A Sidewalk", rarity: "common", value: -1,
    sky: ["#94a3b8", "#cbd5e1"], ground: "#64748b",
    effect: { type: "fog", layer: "front", params: { color: "#cbd5e1", bands: 2, opacity: 0.2, speed: 0.25 } },
  },
  {
    key: "backseat", name: "The Back Seat of a Car", rarity: "common", value: 1,
    sky: ["#1e3a5f", "#3b82f6"], ground: "#334155",
    effect: { type: "fall", layer: "front", params: { color: "#93c5fd", shape: "line", count: 40, speed: 2.8, sway: 0, size: 12, angle: 0.3 } },
  },

  // ---------------- uncommon: still real, slightly worse ----------------
  {
    key: "vet", name: "The Vet's Waiting Room", rarity: "uncommon", value: -3,
    sky: ["#d1fae5", "#a7f3d0"], ground: "#94a3b8",
    effect: { type: "vignette", layer: "front", params: { color: "#0f172a", opacity: 0.45 } },
  },
  {
    key: "petstore", name: "Aisle 4 of a Pet Store", rarity: "uncommon", value: 0,
    sky: ["#fef3c7", "#fde68a"], ground: "#a16207",
    effect: { type: "spotlight", layer: "front", params: { color: "#ffffff", radius: 150, speed: 0.5 } },
  },
  {
    key: "beach", name: "A Beach at Sunset", rarity: "uncommon", value: 3,
    sky: ["#fb923c", "#fcd34d"], ground: "#fde68a",
    effect: { type: "ripple", layer: "back", params: { color: "#fbbf24", rings: 3, speed: 0.55, maxRadius: 150 } },
  },
  {
    key: "forest", name: "A Forest Trail", rarity: "uncommon", value: 2,
    sky: ["#14532d", "#4ade80"], ground: "#166534",
    effect: { type: "rays", layer: "back", params: { color: "#bbf7d0", beams: 6, opacity: 0.26, speed: 0.12 } },
  },
  {
    key: "snow", name: "A Snowy Field", rarity: "uncommon", value: 2,
    sky: ["#475569", "#e2e8f0"], ground: "#f1f5f9",
    effect: { type: "fall", layer: "front", params: { color: "#ffffff", shape: "dot", count: 120, speed: 0.9, sway: 2, size: 3.5 } },
  },
  {
    key: "wendys", name: "A Wendy's Parking Lot", rarity: "uncommon", value: -1,
    sky: ["#7f1d1d", "#f87171"], ground: "#3f3f46",
    effect: { type: "fall", layer: "front", params: { color: "#fca5a5", shape: "square", count: 18, speed: 0.7, sway: 1.4, size: 4 } },
  },
  {
    key: "autumn", name: "A Park in Autumn", rarity: "uncommon", value: 3,
    sky: ["#ea580c", "#fed7aa"], ground: "#7c2d12",
    effect: { type: "fall", layer: "front", params: { color: "#f97316", shape: "leaf", count: 50, speed: 0.65, sway: 3.2, size: 9 } },
  },

  // ---------------- rare ----------------
  {
    key: "dmv", name: "The DMV", rarity: "rare", value: -4,
    sky: ["#a3a3a3", "#d4d4d4"], ground: "#737373",
    effect: { type: "glitch", layer: "front", params: { color: "#a8a29e", intensity: 0.25, scanlines: true } },
  },
  {
    key: "summit", name: "A Mountain Summit", rarity: "rare", value: 5,
    sky: ["#1e293b", "#7dd3fc"], ground: "#e2e8f0",
    effect: { type: "rays", layer: "back", params: { color: "#fef08a", beams: 10, opacity: 0.32, speed: 0.08 } },
  },
  {
    key: "storm", name: "A Thunderstorm", rarity: "rare", value: -2,
    sky: ["#1e1b4b", "#475569"], ground: "#0f172a",
    effect: { type: "lightning", layer: "front", params: { color: "#e0e7ff", frequency: 0.014, bolts: 2 } },
  },
  {
    key: "news", name: "Local News, 6pm", rarity: "rare", value: 4,
    sky: ["#1e40af", "#3b82f6"], ground: "#1e3a8a",
    effect: { type: "glitch", layer: "front", params: { color: "#bfdbfe", intensity: 0.3, scanlines: true } },
  },
  {
    key: "backrooms", name: "The Backrooms", rarity: "rare", value: -3,
    sky: ["#ca8a04", "#fde047"], ground: "#a16207",
    effect: { type: "fog", layer: "front", params: { color: "#fef08a", bands: 3, opacity: 0.22, speed: 0.15 } },
  },
  {
    key: "blossom", name: "A Cherry Blossom Grove", rarity: "rare", value: 6,
    sky: ["#fbcfe8", "#fce7f3"], ground: "#be185d",
    effect: { type: "fall", layer: "front", params: { color: "#f9a8d4", shape: "petal", count: 60, speed: 0.55, sway: 3.4, size: 7 } },
  },
  {
    key: "fireflies", name: "A Field of Fireflies", rarity: "rare", value: 5,
    sky: ["#052e16", "#166534"], ground: "#14532d",
    effect: { type: "rise", layer: "front", params: { color: "#fde047", count: 40, speed: 0.35, sway: 2.4, size: 4, glow: true } },
  },

  // ---------------- epic ----------------
  {
    key: "hell", name: "Hell", rarity: "epic", value: -7,
    sky: ["#450a0a", "#b91c1c"], ground: "#1c1917",
    effect: { type: "rise", layer: "front", params: { color: "#f97316", count: 55, speed: 1.2, sway: 2.8, size: 4, glow: true } },
  },
  {
    key: "underwater", name: "Underwater, Somehow", rarity: "epic", value: 4,
    sky: ["#0c4a6e", "#0ea5e9"], ground: "#075985",
    effect: { type: "rise", layer: "front", params: { color: "#bae6fd", count: 45, speed: 0.6, sway: 1.4, size: 6, hollow: true } },
  },
  {
    key: "moon", name: "The Moon", rarity: "epic", value: 6,
    sky: ["#0f172a", "#1e293b"], ground: "#d4d4d8",
    effect: { type: "stars", layer: "back", params: { color: "#ffffff", count: 90, twinkle: 0.5 } },
  },
  {
    key: "aurora", name: "Under the Northern Lights", rarity: "epic", value: 8,
    sky: ["#0f172a", "#134e4a"], ground: "#e2e8f0",
    effect: { type: "aurora", layer: "back", params: { colors: ["#34d399", "#22d3ee", "#a78bfa"], bands: 3, speed: 0.22 } },
  },
  {
    key: "renaissance", name: "A Renaissance Painting", rarity: "epic", value: 7,
    sky: ["#78350f", "#a16207"], ground: "#451a03",
    effect: { type: "rays", layer: "back", params: { color: "#fcd34d", beams: 7, opacity: 0.3, speed: 0.05 } },
  },
  {
    key: "graveyard", name: "A Graveyard", rarity: "epic", value: -5,
    sky: ["#111827", "#4c1d95"], ground: "#1f2937",
    effect: { type: "fog", layer: "front", params: { color: "#c4b5fd", bands: 4, opacity: 0.28, speed: 0.4 } },
  },

  // ---------------- legendary ----------------
  {
    key: "void", name: "Nowhere", rarity: "legendary", value: -8,
    sky: ["#000000", "#1c1917"], ground: "#000000",
    effect: { type: "glitch", layer: "front", params: { color: "#dc2626", intensity: 0.9, scanlines: true, tear: true } },
  },
  {
    key: "space", name: "Deep Space", rarity: "legendary", value: 10,
    sky: ["#1e1b4b", "#7e22ce"], ground: "#312e81",
    effect: { type: "stars", layer: "back", params: { color: "#ffffff", count: 140, twinkle: 0.85, nebula: "#a855f7" } },
  },
  {
    key: "heaven", name: "Heaven", rarity: "legendary", value: 12,
    sky: ["#fef9c3", "#fefce8"], ground: "#fde68a",
    effect: { type: "rays", layer: "back", params: { color: "#fef08a", beams: 14, opacity: 0.45, speed: 0.05, holy: true } },
  },
  {
    key: "dream", name: "Someone Else's Dream", rarity: "legendary", value: 6,
    sky: ["#7e22ce", "#f0abfc"], ground: "#c026d3",
    effect: { type: "ripple", layer: "back", params: { color: "#f5d0fe", rings: 5, speed: 0.9, maxRadius: 220, warp: true } },
  },
];

// Modifiers. Plainly stated, positive and negative, with the score doing the editorial work.
export const MODIFIERS = [
  // ===== health =====
  { text: "Has malaria", value: -6, category: "health",
    effect: { type: "drain", layer: "subject", params: { amount: 0.7 } } },
  { text: "Worms", value: -3, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.4, hue: 40, saturate: 0.8 } } },
  { text: "Hip dysplasia", value: -4, category: "health", effect: null },
  { text: "Blind in one eye", value: -3, category: "health",
    effect: { type: "vignette", layer: "front", params: { color: "#000000", opacity: 0.55 } } },
  { text: "Three legs", value: -2, category: "health",
    effect: { type: "wobble", layer: "subject", params: { period: 900 } } },
  { text: "Ate a sock. Surgically removed.", value: -4, category: "health",
    effect: { type: "orbit", layer: "front", params: { emoji: "🧦", count: 3, radius: 88, speed: 0.8, size: 18 } } },
  { text: "$400 a month in medication", value: -5, category: "health", effect: null },
  { text: "Eternal hunger", value: -5, category: "health",
    effect: { type: "orbit", layer: "front", params: { emoji: "🍖", count: 5, radius: 96, speed: 1.6, size: 17 } } },
  { text: "Perfect bloodwork", value: 4, category: "health",
    effect: { type: "halo", layer: "subject", params: { color: "#4ade80", size: 12 } } },
  { text: "Insured, thankfully", value: 3, category: "health", effect: null },
  { text: "Deaf, but coping", value: -1, category: "health",
    effect: { type: "blur", layer: "subject", params: { amount: 1 } } },
  { text: "Vet says he's fine. He is not fine.", value: -3, category: "health",
    effect: { type: "chromatic", layer: "subject", params: { offset: 2 } } },

  // ===== temperament =====
  { text: "Certified therapy dog", value: 5, category: "temperament",
    effect: { type: "pulse", layer: "back", params: { color: "#4ade80", period: 2600, radius: 190 } } },
  { text: "Likes everyone immediately", value: 4, category: "temperament",
    effect: { type: "rise", layer: "front", params: { color: "#fb7185", count: 18, speed: 0.5, sway: 1.8, size: 9, shape: "heart" } } },
  { text: "Comes when called, every time", value: 4, category: "temperament",
    effect: { type: "halo", layer: "subject", params: { color: "#38bdf8", size: 10 } } },
  { text: "Sleeps through the night", value: 3, category: "temperament", effect: null },
  { text: "Good with kids", value: 2, category: "temperament",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 26, spread: 130 } } },
  { text: "Fine with cats", value: 2, category: "temperament",
    effect: { type: "orbit", layer: "front", params: { emoji: "🐈", count: 2, radius: 90, speed: 0.5, size: 18 } } },
  { text: "Ignores you completely outdoors", value: -2, category: "temperament", effect: null },
  { text: "Barks at nothing for forty minutes", value: -3, category: "temperament",
    effect: { type: "shake", layer: "front", params: { intensity: 3, period: 900 } } },
  { text: "Banned from the dog park", value: -5, category: "temperament",
    effect: { type: "glitch", layer: "front", params: { color: "#ef4444", intensity: 0.6, scanlines: false } } },
  { text: "Bit a groomer once", value: -4, category: "temperament",
    effect: { type: "chromatic", layer: "subject", params: { offset: 3 } } },
  { text: "Ate a child", value: -9, category: "temperament",
    effect: { type: "invert", layer: "subject", params: { amount: 0.8 } } },
  { text: "Kleptomania", value: -4, category: "temperament",
    effect: { type: "orbit", layer: "front", params: { emoji: "💍", count: 4, radius: 92, speed: 1.4, size: 15 } } },
  { text: "Afraid of men in hats", value: -2, category: "temperament",
    effect: { type: "orbit", layer: "front", params: { emoji: "🎩", count: 2, radius: 95, speed: 1.2, size: 17 } } },

  // ===== circumstance: the owner's life, stated without comment =====
  { text: "Owner is getting divorced", value: -4, category: "circumstance",
    effect: { type: "drain", layer: "subject", params: { amount: 0.5 } } },
  { text: "Rehomed twice", value: -3, category: "circumstance", effect: null },
  { text: "Was on the news once", value: 3, category: "circumstance",
    effect: { type: "spotlight", layer: "front", params: { color: "#fef08a", radius: 130, speed: 0.6 } } },
  { text: "Lives in a studio apartment", value: -2, category: "circumstance", effect: null },
  { text: "Has a better bed than you", value: 2, category: "circumstance", effect: null },
  { text: "Named after the owner's ex", value: -1, category: "circumstance", effect: null },
  { text: "Inherited, along with the house", value: 1, category: "circumstance", effect: null },
  { text: "Four owners deep", value: -3, category: "circumstance",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.7 } } },

  // ===== habits =====
  { text: "Zoomies at 3am", value: -1, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 280 } } },
  { text: "Steals food off the counter", value: -2, category: "habit",
    effect: { type: "orbit", layer: "front", params: { emoji: "🥩", count: 2, radius: 84, speed: 1.1, size: 18 } } },
  { text: "Digs holes in the yard", value: -2, category: "habit",
    effect: { type: "fall", layer: "front", params: { color: "#92400e", shape: "square", count: 30, speed: 1.3, sway: 0.6, size: 5 } } },
  { text: "Rolls in dead things", value: -3, category: "habit",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.6, hue: 60, saturate: 0.7 } } },
  { text: "Chases his tail for hours", value: -3, category: "habit",
    effect: { type: "spin", layer: "subject", params: { period: 3500 } } },
  { text: "Screams instead of barking", value: 0, category: "habit",
    effect: { type: "ripple", layer: "back", params: { color: "#fca5a5", rings: 4, speed: 1.4, maxRadius: 170 } } },
  { text: "Sleeps in an upsetting position", value: 0, category: "habit",
    effect: { type: "squish", layer: "subject", params: { period: 1600 } } },
  { text: "Waits by the door all day", value: 1, category: "habit", effect: null },
  { text: "Never once had an accident indoors", value: 3, category: "habit", effect: null },

  // ===== condition: appearance and upkeep =====
  { text: "Wearing a small hat", value: 3, category: "condition",
    effect: { type: "orbit", layer: "front", params: { emoji: "🎩", count: 1, radius: 76, speed: 0.6, size: 20 } } },
  { text: "Cone of shame", value: -3, category: "condition",
    effect: { type: "fog", layer: "front", params: { color: "#94a3b8", bands: 2, opacity: 0.3, speed: 0.5 } } },
  { text: "Covered in mud", value: -2, category: "condition",
    effect: { type: "fall", layer: "front", params: { color: "#78350f", shape: "dot", count: 40, speed: 1.4, sway: 1, size: 4.5 } } },
  { text: "Groomed this morning", value: 3, category: "condition",
    effect: { type: "halo", layer: "subject", params: { color: "#ffffff", size: 10, brightness: 1.15 } } },
  { text: "Smells, and everyone knows", value: -3, category: "condition",
    effect: { type: "rise", layer: "front", params: { color: "#84cc16", count: 20, speed: 0.4, sway: 2.6, size: 4, glow: true } } },
  { text: "Wearing a sweater someone knitted", value: 3, category: "condition",
    effect: { type: "fall", layer: "front", params: { color: "#fda4af", shape: "dot", count: 22, speed: 0.3, sway: 2, size: 4 } } },
  { text: "Soaking wet", value: -1, category: "condition",
    effect: { type: "fall", layer: "front", params: { color: "#93c5fd", shape: "line", count: 34, speed: 2.4, sway: 0, size: 10 } } },
  { text: "Surrounded by bees", value: -3, category: "condition",
    effect: { type: "orbit", layer: "front", params: { emoji: "🐝", count: 6, radius: 100, speed: 2.1, size: 15 } } },
  { text: "Slightly out of focus, always", value: -2, category: "condition",
    effect: { type: "blur", layer: "subject", params: { amount: 2.2 } } },
  { text: "Photographs badly", value: -1, category: "condition",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.7, hue: 10, saturate: 1.8 } } },
  { text: "Glows faintly. Unexplained.", value: 4, category: "condition",
    effect: { type: "halo", layer: "subject", params: { color: "#22d3ee", size: 18, brightness: 1.2 } } },
  { text: "Technically deceased", value: -6, category: "condition",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.45, blur: 1.2 } } },
  { text: "Statistically the luckiest dog alive", value: 5, category: "condition",
    effect: { type: "burst", layer: "front", params: { color: "#4ade80", count: 44, spread: 200, confetti: true } } },
];

export const MODIFIER_COUNT = 3;

// Thresholds sit on the measured percentiles of the score distribution, so "a dog" really
// is the middle and the outer tiers stay rare.
export const QUALITY_TIERS = [
  { max: -12, label: "Genuinely Concerning", color: "#f87171" },
  { max: -5, label: "Rough", color: "#fb923c" },
  { max: 3, label: "A Dog", color: "#facc15" },
  { max: 9, label: "Good Dog", color: "#4ade80" },
  { max: Infinity, label: "Exceptional Animal", color: "#22d3ee" },
];
