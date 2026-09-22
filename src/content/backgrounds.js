// The place the dog happens to be standing. One of these is rolled per dog and it scores
// like a trait, so a background is a jackpot as much as a setting.
//
// Backgrounds carry `props` -- silhouettes in relative coordinates (rect, ellipse, tri,
// hills) drawn behind the dog. Without them every scene was a sky gradient over a flat
// band, and 46 different places looked like one place in different colours.
//
// Sorted by key for the same reason the traits are: see ./traits/index.js.

export const BACKGROUND_WEIGHTS = {
  common: 30,
  uncommon: 28,
  rare: 22,
  epic: 15,
  legendary: 5,
};

const SCENES = [
  // ---------------- common: mundane places a dog is actually in ----------------
  {
    key: "backyard", emoji: "🌳", name: "A Backyard", rarity: "common", value: 0,
    sky: ["#7dd3fc", "#bae6fd"], ground: "#4d7c0f",
    effect: { type: "fall", layer: "front", params: { color: "#a3e635", shape: "leaf", count: 30, speed: 0.4, sway: 2, size: 8 } },
    props: [{ shape: "rect", x: 0.12, y: 0.52, w: 0.1, h: 0.2, color: "#3f6212" }, { shape: "tri", x: 0.85, y: 0.34, w: 0.26, h: 0.35, color: "#365314" }, { shape: "rect", x: 0.5, y: 0.66, w: 1.2, h: 0.03, color: "#365314", alpha: 0.7 }],
  },
  {
    key: "couch", emoji: "🛋️", name: "The Couch", rarity: "common", value: 1,
    sky: ["#7c2d12", "#b45309"], ground: "#57534e",
    effect: { type: "fall", layer: "front", params: { color: "#fde68a", shape: "dot", count: 26, speed: 0.12, sway: 3, size: 3 } },
    props: [{ shape: "rect", x: 0.5, y: 0.42, w: 1.1, h: 0.3, color: "#7f1d1d" }, { shape: "ellipse", x: 0.16, y: 0.5, w: 0.3, h: 0.34, color: "#991b1b" }, { shape: "ellipse", x: 0.84, y: 0.5, w: 0.3, h: 0.34, color: "#991b1b" }],
  },
  {
    key: "kitchen", emoji: "🍽️", name: "The Kitchen Floor", rarity: "common", value: 0,
    sky: ["#d6d3d1", "#a8a29e"], ground: "#e7e5e4",
    effect: { type: "fall", layer: "front", params: { color: "#b45309", shape: "square", count: 24, speed: 0.6, sway: 0.5, size: 4 } },
    props: [{ shape: "rect", x: 0.5, y: 0.2, w: 1.2, h: 0.24, color: "#a8a29e" }, { shape: "rect", x: 0.2, y: 0.44, w: 0.22, h: 0.26, color: "#78716c" }, { shape: "rect", x: 0.78, y: 0.44, w: 0.3, h: 0.26, color: "#78716c" }],
  },
  {
    key: "dogpark", emoji: "🎾", name: "The Dog Park", rarity: "common", value: 2,
    sky: ["#60a5fa", "#a7f3d0"], ground: "#65a30d",
    effect: { type: "fall", layer: "front", params: { color: "#bef264", shape: "leaf", count: 26, speed: 0.5, sway: 2.2, size: 7 } },
    props: [{ shape: "tri", x: 0.12, y: 0.28, w: 0.3, h: 0.42, color: "#166534" }, { shape: "tri", x: 0.88, y: 0.34, w: 0.26, h: 0.36, color: "#14532d" }, { shape: "rect", x: 0.5, y: 0.6, w: 1.2, h: 0.02, color: "#78716c" }],
  },
  {
    key: "sidewalk", emoji: "🚶", name: "A Sidewalk", rarity: "common", value: -1,
    sky: ["#94a3b8", "#cbd5e1"], ground: "#64748b",
    effect: { type: "fog", layer: "front", params: { color: "#cbd5e1", bands: 2, opacity: 0.2, speed: 0.25 } },
    props: [{ shape: "rect", x: 0.14, y: 0.12, w: 0.24, h: 0.58, color: "#475569" }, { shape: "rect", x: 0.86, y: 0.2, w: 0.3, h: 0.5, color: "#334155" }, { shape: "rect", x: 0.5, y: 0.72, w: 1.2, h: 0.015, color: "#94a3b8" }],
  },
  {
    key: "backseat", emoji: "🚗", name: "The Back Seat of a Car", rarity: "common", value: 1,
    sky: ["#1e3a5f", "#3b82f6"], ground: "#334155",
    effect: { type: "fall", layer: "front", params: { color: "#93c5fd", shape: "line", count: 40, speed: 2.8, sway: 0, size: 12, angle: 0.3 } },
    props: [{ shape: "rect", x: 0.5, y: 0.1, w: 1.2, h: 0.12, color: "#1e293b" }, { shape: "rect", x: 0.08, y: 0.2, w: 0.14, h: 0.6, color: "#0f172a" }, { shape: "rect", x: 0.92, y: 0.2, w: 0.14, h: 0.6, color: "#0f172a" }],
  },

  // ---------------- uncommon: still real, slightly worse ----------------
  {
    key: "vet", emoji: "🏥", name: "The Vet's Waiting Room", rarity: "uncommon", value: -3,
    sky: ["#d1fae5", "#a7f3d0"], ground: "#94a3b8",
    effect: { type: "vignette", layer: "front", params: { color: "#0f172a", opacity: 0.45 } },
    props: [{ shape: "rect", x: 0.5, y: 0.18, w: 1.2, h: 0.06, color: "#a7f3d0" }, { shape: "rect", x: 0.12, y: 0.46, w: 0.26, h: 0.26, color: "#64748b" }, { shape: "rect", x: 0.88, y: 0.46, w: 0.26, h: 0.26, color: "#64748b" }],
  },
  {
    key: "petstore", emoji: "🛒", name: "Aisle 4 of a Pet Store", rarity: "uncommon", value: 0,
    sky: ["#fef3c7", "#fde68a"], ground: "#a16207",
    effect: { type: "spotlight", layer: "front", params: { color: "#ffffff", radius: 150, speed: 0.5 } },
    props: [{ shape: "rect", x: 0.12, y: 0.1, w: 0.26, h: 0.62, color: "#78350f" }, { shape: "rect", x: 0.88, y: 0.1, w: 0.26, h: 0.62, color: "#78350f" }, { shape: "rect", x: 0.12, y: 0.34, w: 0.26, h: 0.04, color: "#fbbf24" }, { shape: "rect", x: 0.88, y: 0.34, w: 0.26, h: 0.04, color: "#fbbf24" }],
  },
  {
    key: "beach", emoji: "🏖️", name: "A Beach at Sunset", rarity: "uncommon", value: 3,
    sky: ["#fb923c", "#fcd34d"], ground: "#fde68a",
    effect: { type: "ripple", layer: "back", params: { color: "#fbbf24", rings: 3, speed: 0.55, maxRadius: 150 } },
    props: [{ shape: "hills", y: 0.66, h: 0.03, waves: 3, color: "#0ea5e9", alpha: 0.75 }, { shape: "ellipse", x: 0.78, y: 0.2, w: 0.16, h: 0.21, color: "#fef3c7", alpha: 0.9 }],
  },
  {
    key: "forest", emoji: "🌲", name: "A Forest Trail", rarity: "uncommon", value: 2,
    sky: ["#14532d", "#4ade80"], ground: "#166534",
    effect: { type: "rays", layer: "back", params: { color: "#bbf7d0", beams: 6, opacity: 0.26, speed: 0.12 } },
    props: [{ shape: "tri", x: 0.1, y: 0.06, w: 0.26, h: 0.66, color: "#052e16" }, { shape: "tri", x: 0.34, y: 0.2, w: 0.2, h: 0.52, color: "#064e3b" }, { shape: "tri", x: 0.9, y: 0.1, w: 0.28, h: 0.62, color: "#052e16" }, { shape: "tri", x: 0.68, y: 0.24, w: 0.18, h: 0.48, color: "#064e3b" }],
  },
  {
    key: "snow", emoji: "❄️", name: "A Snowy Field", rarity: "uncommon", value: 2,
    sky: ["#475569", "#e2e8f0"], ground: "#f1f5f9",
    effect: { type: "fall", layer: "front", params: { color: "#ffffff", shape: "dot", count: 120, speed: 0.9, sway: 2, size: 3.5 } },
    props: [{ shape: "tri", x: 0.2, y: 0.34, w: 0.42, h: 0.34, color: "#cbd5e1" }, { shape: "tri", x: 0.72, y: 0.28, w: 0.5, h: 0.4, color: "#94a3b8" }],
  },
  {
    key: "wendys", emoji: "🍔", name: "A Wendy's Parking Lot", rarity: "uncommon", value: -1,
    sky: ["#7f1d1d", "#f87171"], ground: "#3f3f46",
    effect: { type: "fall", layer: "front", params: { color: "#fca5a5", shape: "square", count: 18, speed: 0.7, sway: 1.4, size: 4 } },
    props: [{ shape: "rect", x: 0.5, y: 0.22, w: 0.7, h: 0.32, color: "#991b1b" }, { shape: "rect", x: 0.5, y: 0.3, w: 0.42, h: 0.1, color: "#fecaca" }, { shape: "rect", x: 0.5, y: 0.78, w: 0.36, h: 0.015, color: "#fbbf24" }],
  },
  {
    key: "autumn", emoji: "🍂", name: "A Park in Autumn", rarity: "uncommon", value: 3,
    sky: ["#ea580c", "#fed7aa"], ground: "#7c2d12",
    effect: { type: "fall", layer: "front", params: { color: "#f97316", shape: "leaf", count: 50, speed: 0.65, sway: 3.2, size: 9 } },
    props: [{ shape: "rect", x: 0.14, y: 0.2, w: 0.05, h: 0.52, color: "#78350f" }, { shape: "ellipse", x: 0.14, y: 0.22, w: 0.34, h: 0.3, color: "#c2410c" }, { shape: "rect", x: 0.86, y: 0.3, w: 0.04, h: 0.42, color: "#78350f" }, { shape: "ellipse", x: 0.86, y: 0.3, w: 0.26, h: 0.24, color: "#ea580c" }],
  },

  // ---------------- rare ----------------
  {
    key: "dmv", emoji: "🎫", name: "The DMV", rarity: "rare", value: -4,
    sky: ["#a3a3a3", "#d4d4d4"], ground: "#737373",
    effect: { type: "glitch", layer: "front", params: { color: "#a8a29e", intensity: 0.25, scanlines: true } },
    props: [{ shape: "rect", x: 0.5, y: 0.12, w: 1.2, h: 0.1, color: "#525252" }, { shape: "rect", x: 0.16, y: 0.36, w: 0.28, h: 0.34, color: "#a3a3a3" }, { shape: "rect", x: 0.84, y: 0.36, w: 0.28, h: 0.34, color: "#a3a3a3" }, { shape: "rect", x: 0.5, y: 0.2, w: 0.2, h: 0.06, color: "#fca5a5" }],
  },
  {
    key: "summit", emoji: "🏔️", name: "A Mountain Summit", rarity: "rare", value: 5,
    sky: ["#1e293b", "#7dd3fc"], ground: "#e2e8f0",
    effect: { type: "rays", layer: "back", params: { color: "#fef08a", beams: 10, opacity: 0.32, speed: 0.08 } },
    props: [{ shape: "tri", x: 0.22, y: 0.2, w: 0.5, h: 0.5, color: "#475569" }, { shape: "tri", x: 0.74, y: 0.12, w: 0.62, h: 0.58, color: "#334155" }, { shape: "tri", x: 0.74, y: 0.12, w: 0.24, h: 0.16, color: "#f1f5f9" }],
  },
  {
    key: "storm", emoji: "⛈️", name: "A Thunderstorm", rarity: "rare", value: -2,
    sky: ["#1e1b4b", "#475569"], ground: "#0f172a",
    effect: { type: "lightning", layer: "front", params: { color: "#e0e7ff", frequency: 0.014 } },
    props: [{ shape: "hills", y: 0.7, h: 0.05, waves: 2, color: "#020617" }, { shape: "tri", x: 0.18, y: 0.4, w: 0.3, h: 0.32, color: "#020617" }],
  },
  {
    key: "news", emoji: "📺", name: "Local News, 6pm", rarity: "rare", value: 4,
    sky: ["#1e40af", "#3b82f6"], ground: "#1e3a8a",
    effect: { type: "glitch", layer: "front", params: { color: "#bfdbfe", intensity: 0.3, scanlines: true } },
    props: [{ shape: "rect", x: 0.5, y: 0.08, w: 1.2, h: 0.1, color: "#1e3a8a" }, { shape: "rect", x: 0.5, y: 0.76, w: 1.2, h: 0.1, color: "#dc2626" }, { shape: "rect", x: 0.2, y: 0.78, w: 0.3, h: 0.04, color: "#fef3c7" }],
  },
  {
    key: "backrooms", emoji: "🚪", name: "The Backrooms", rarity: "rare", value: -3,
    sky: ["#ca8a04", "#fde047"], ground: "#a16207",
    effect: { type: "fog", layer: "front", params: { color: "#fef08a", bands: 3, opacity: 0.22, speed: 0.15 } },
    props: [{ shape: "rect", x: 0.5, y: 0.1, w: 0.5, h: 0.62, color: "#a16207" }, { shape: "rect", x: 0.5, y: 0.1, w: 0.2, h: 0.62, color: "#854d0e" }, { shape: "rect", x: 0.06, y: 0.0, w: 0.16, h: 0.8, color: "#ca8a04" }, { shape: "rect", x: 0.94, y: 0.0, w: 0.16, h: 0.8, color: "#ca8a04" }],
  },
  {
    key: "blossom", emoji: "🌸", name: "A Cherry Blossom Grove", rarity: "rare", value: 6,
    sky: ["#fbcfe8", "#fce7f3"], ground: "#be185d",
    effect: { type: "fall", layer: "front", params: { color: "#f9a8d4", shape: "petal", count: 60, speed: 0.55, sway: 3.4, size: 7 } },
    props: [{ shape: "rect", x: 0.12, y: 0.3, w: 0.05, h: 0.42, color: "#78350f" }, { shape: "ellipse", x: 0.12, y: 0.28, w: 0.34, h: 0.26, color: "#f9a8d4", alpha: 0.9 }, { shape: "rect", x: 0.88, y: 0.36, w: 0.04, h: 0.36, color: "#78350f" }, { shape: "ellipse", x: 0.88, y: 0.34, w: 0.28, h: 0.22, color: "#fbcfe8", alpha: 0.9 }],
  },
  {
    key: "fireflies", emoji: "✨", name: "A Field of Fireflies", rarity: "rare", value: 5,
    sky: ["#052e16", "#166534"], ground: "#14532d",
    effect: { type: "rise", layer: "front", params: { color: "#fde047", count: 40, speed: 0.35, sway: 2.4, size: 4, glow: true } },
    props: [{ shape: "tri", x: 0.1, y: 0.22, w: 0.24, h: 0.5, color: "#022c22" }, { shape: "tri", x: 0.9, y: 0.3, w: 0.22, h: 0.42, color: "#022c22" }, { shape: "hills", y: 0.68, h: 0.03, waves: 3, color: "#064e3b" }],
  },

  // ---------------- epic ----------------
  {
    key: "hell", emoji: "🔥", name: "Hell", rarity: "epic", value: -7,
    sky: ["#450a0a", "#b91c1c"], ground: "#1c1917",
    effect: { type: "rise", layer: "front", params: { color: "#f97316", count: 55, speed: 1.2, sway: 2.8, size: 4, glow: true } },
    props: [{ shape: "tri", x: 0.16, y: 0.3, w: 0.36, h: 0.4, color: "#450a0a" }, { shape: "tri", x: 0.86, y: 0.36, w: 0.34, h: 0.34, color: "#450a0a" }, { shape: "hills", y: 0.68, h: 0.04, waves: 5, color: "#7f1d1d" }],
  },
  {
    key: "underwater", emoji: "🌊", name: "Underwater, Somehow", rarity: "epic", value: 4,
    sky: ["#0c4a6e", "#0ea5e9"], ground: "#075985",
    effect: { type: "rise", layer: "front", params: { color: "#bae6fd", count: 45, speed: 0.6, sway: 1.4, size: 6, hollow: true } },
  },
  {
    key: "moon", emoji: "🌙", name: "The Moon", rarity: "epic", value: 6,
    sky: ["#0f172a", "#1e293b"], ground: "#d4d4d8",
    effect: { type: "stars", layer: "back", params: { color: "#ffffff", count: 90, twinkle: 0.5 } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.9, w: 2.2, h: 0.5, color: "#a1a1aa" }, { shape: "ellipse", x: 0.2, y: 0.24, w: 0.3, h: 0.3, color: "#1e40af", alpha: 0.8 }, { shape: "ellipse", x: 0.2, y: 0.24, w: 0.22, h: 0.22, color: "#3b82f6", alpha: 0.7 }],
  },
  {
    key: "aurora", emoji: "🌌", name: "Under the Northern Lights", rarity: "epic", value: 8,
    sky: ["#0f172a", "#134e4a"], ground: "#e2e8f0",
    effect: { type: "aurora", layer: "back", params: { colors: ["#34d399", "#22d3ee", "#a78bfa"], bands: 3, speed: 0.22 } },
  },
  {
    key: "renaissance", emoji: "🖼️", name: "A Renaissance Painting", rarity: "epic", value: 7,
    sky: ["#78350f", "#a16207"], ground: "#451a03",
    effect: { type: "rays", layer: "back", params: { color: "#fcd34d", beams: 7, opacity: 0.3, speed: 0.05 } },
    props: [{ shape: "rect", x: 0.5, y: 0.0, w: 1.2, h: 0.06, color: "#facc15" }, { shape: "rect", x: 0.5, y: 0.76, w: 1.2, h: 0.06, color: "#facc15" }, { shape: "rect", x: 0.04, y: 0.0, w: 0.08, h: 0.9, color: "#facc15" }, { shape: "rect", x: 0.96, y: 0.0, w: 0.08, h: 0.9, color: "#facc15" }],
  },
  {
    key: "graveyard", emoji: "🪦", name: "A Graveyard", rarity: "epic", value: -5,
    sky: ["#111827", "#4c1d95"], ground: "#1f2937",
    effect: { type: "fog", layer: "front", params: { color: "#c4b5fd", bands: 4, opacity: 0.28, speed: 0.4 } },
    props: [{ shape: "rect", x: 0.14, y: 0.5, w: 0.08, h: 0.22, color: "#475569" }, { shape: "ellipse", x: 0.14, y: 0.5, w: 0.08, h: 0.08, color: "#475569" }, { shape: "rect", x: 0.84, y: 0.54, w: 0.07, h: 0.18, color: "#334155" }, { shape: "tri", x: 0.5, y: 0.3, w: 0.3, h: 0.3, color: "#0f172a", alpha: 0.6 }],
  },

  // ---------------- legendary ----------------
  {
    key: "void", emoji: "🕳️", name: "Nowhere", rarity: "legendary", value: -8,
    sky: ["#000000", "#1c1917"], ground: "#000000",
    effect: { type: "glitch", layer: "front", params: { color: "#dc2626", intensity: 0.9, scanlines: true, tear: true } },
  },
  {
    key: "space", emoji: "🪐", name: "Deep Space", rarity: "legendary", value: 10,
    sky: ["#1e1b4b", "#7e22ce"], ground: "#312e81",
    effect: { type: "stars", layer: "back", params: { color: "#ffffff", count: 140, twinkle: 0.85, nebula: "#a855f7" } },
  },
  {
    key: "heaven", emoji: "☁️", name: "Heaven", rarity: "legendary", value: 12,
    sky: ["#fef9c3", "#fefce8"], ground: "#fde68a",
    effect: { type: "rays", layer: "back", params: { color: "#fef08a", beams: 14, opacity: 0.45, speed: 0.05, holy: true } },
  },
  {
    key: "dream", emoji: "💭", name: "Someone Else's Dream", rarity: "legendary", value: 6,
    sky: ["#7e22ce", "#f0abfc"], ground: "#c026d3",
    effect: { type: "ripple", layer: "back", params: { color: "#f5d0fe", rings: 5, speed: 0.9, maxRadius: 220, warp: true } },
  },

  // ---------------- exotic: worth travelling for, or worth avoiding ----------------
  {
    key: "serengeti", emoji: "🦁", name: "The Serengeti at Dawn", rarity: "rare", value: 6,
    sky: ["#f59e0b", "#fde68a"], ground: "#a16207",
    effect: { type: "rays", layer: "back", params: { color: "#fef3c7", beams: 9, opacity: 0.3, speed: 0.07 } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.34, w: 0.22, h: 0.22, color: "#fef3c7" }, { shape: "rect", x: 0.16, y: 0.36, w: 0.03, h: 0.34, color: "#78350f" }, { shape: "ellipse", x: 0.16, y: 0.34, w: 0.3, h: 0.1, color: "#57534e" }, { shape: "rect", x: 0.86, y: 0.42, w: 0.02, h: 0.28, color: "#78350f" }, { shape: "ellipse", x: 0.86, y: 0.4, w: 0.22, h: 0.07, color: "#57534e" }],
  },
  {
    key: "onsen", emoji: "♨️", name: "A Japanese Onsen", rarity: "rare", value: 6,
    sky: ["#0f766e", "#5eead4"], ground: "#134e4a",
    effect: { type: "fog", layer: "front", params: { color: "#ccfbf1", bands: 4, opacity: 0.32, speed: 0.22 } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.78, w: 1.1, h: 0.3, color: "#14b8a6", alpha: 0.5 }, { shape: "rect", x: 0.12, y: 0.4, w: 0.2, h: 0.3, color: "#134e4a" }, { shape: "rect", x: 0.88, y: 0.44, w: 0.2, h: 0.26, color: "#134e4a" }],
  },
  {
    key: "tuscany", emoji: "🍇", name: "A Vineyard in Tuscany", rarity: "rare", value: 6,
    sky: ["#84cc16", "#fef08a"], ground: "#4d7c0f",
    effect: { type: "rays", layer: "back", params: { color: "#fef9c3", beams: 7, opacity: 0.26, speed: 0.06 } },
    props: [{ shape: "hills", y: 0.6, h: 0.08, waves: 3, color: "#4d7c0f" }, { shape: "rect", x: 0.82, y: 0.4, w: 0.04, h: 0.24, color: "#166534" }, { shape: "ellipse", x: 0.82, y: 0.38, w: 0.14, h: 0.18, color: "#15803d" }],
  },
  {
    key: "sahara", emoji: "🏜️", name: "The Sahara at Dusk", rarity: "rare", value: 4,
    sky: ["#c2410c", "#fdba74"], ground: "#d97706",
    effect: { type: "fall", layer: "front", params: { color: "#fed7aa", shape: "dot", count: 70, speed: 1.1, sway: 3, size: 2.5, angle: 0.6 } },
    props: [{ shape: "hills", y: 0.62, h: 0.08, waves: 2, color: "#b45309" }, { shape: "ellipse", x: 0.3, y: 0.28, w: 0.18, h: 0.18, color: "#fed7aa", alpha: 0.9 }],
  },
  {
    key: "amalfi", emoji: "🍋", name: "The Amalfi Coast", rarity: "epic", value: 8,
    sky: ["#0284c7", "#bae6fd"], ground: "#e0f2fe",
    effect: { type: "ripple", layer: "back", params: { color: "#7dd3fc", rings: 4, speed: 0.5, maxRadius: 180 } },
    props: [{ shape: "hills", y: 0.66, h: 0.04, waves: 4, color: "#0369a1", alpha: 0.8 }, { shape: "rect", x: 0.12, y: 0.38, w: 0.12, h: 0.3, color: "#fef3c7" }, { shape: "rect", x: 0.24, y: 0.46, w: 0.1, h: 0.22, color: "#fed7aa" }, { shape: "rect", x: 0.88, y: 0.42, w: 0.12, h: 0.26, color: "#fef9c3" }],
  },
  {
    key: "reef", emoji: "🐠", name: "The Great Barrier Reef", rarity: "epic", value: 7,
    sky: ["#0e7490", "#22d3ee"], ground: "#155e75",
    effect: { type: "rise", layer: "front", params: { color: "#a5f3fc", count: 50, speed: 0.55, sway: 1.8, size: 5, hollow: true } },
    props: [{ shape: "ellipse", x: 0.18, y: 0.66, w: 0.26, h: 0.3, color: "#f472b6", alpha: 0.6 }, { shape: "ellipse", x: 0.84, y: 0.68, w: 0.3, h: 0.26, color: "#fb923c", alpha: 0.55 }, { shape: "ellipse", x: 0.5, y: 0.82, w: 0.5, h: 0.2, color: "#a78bfa", alpha: 0.45 }],
  },
  {
    key: "icehotel", emoji: "🧊", name: "An Ice Hotel", rarity: "epic", value: 6,
    sky: ["#93c5fd", "#e0f2fe"], ground: "#f8fafc",
    effect: { type: "fall", layer: "front", params: { color: "#ffffff", shape: "dot", count: 80, speed: 0.5, sway: 1.4, size: 3 } },
    props: [{ shape: "rect", x: 0.14, y: 0.26, w: 0.2, h: 0.46, color: "#bfdbfe", alpha: 0.7 }, { shape: "rect", x: 0.86, y: 0.32, w: 0.22, h: 0.4, color: "#dbeafe", alpha: 0.7 }, { shape: "tri", x: 0.5, y: 0.2, w: 0.4, h: 0.2, color: "#e0f2fe", alpha: 0.5 }],
  },
  {
    key: "jet", emoji: "✈️", name: "Someone's Private Jet", rarity: "epic", value: 9,
    sky: ["#78350f", "#fcd34d"], ground: "#451a03",
    effect: { type: "spotlight", layer: "front", params: { color: "#fef3c7", radius: 140, speed: 0.3 } },
    props: [{ shape: "ellipse", x: 0.16, y: 0.3, w: 0.2, h: 0.26, color: "#fde68a", alpha: 0.85 }, { shape: "ellipse", x: 0.84, y: 0.3, w: 0.2, h: 0.26, color: "#fde68a", alpha: 0.85 }, { shape: "rect", x: 0.5, y: 0.72, w: 1.2, h: 0.06, color: "#292524" }],
  },
  {
    key: "well", emoji: "🪣", name: "The Bottom of a Well", rarity: "rare", value: -5,
    sky: ["#0c0a09", "#292524"], ground: "#0c0a09",
    effect: { type: "vignette", layer: "front", params: { color: "#000000", opacity: 0.72 } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.1, w: 0.42, h: 0.16, color: "#1c1917" }, { shape: "ellipse", x: 0.5, y: 0.11, w: 0.32, h: 0.11, color: "#78716c", alpha: 0.5 }],
  },
  {
    key: "landfill", emoji: "🗑️", name: "A Landfill", rarity: "rare", value: -5,
    sky: ["#78716c", "#a8a29e"], ground: "#57534e",
    effect: { type: "fall", layer: "front", params: { color: "#a16207", shape: "square", count: 34, speed: 0.9, sway: 1.6, size: 5 } },
    props: [{ shape: "hills", y: 0.64, h: 0.09, waves: 4, color: "#57534e" }, { shape: "rect", x: 0.2, y: 0.6, w: 0.06, h: 0.06, color: "#a16207" }, { shape: "rect", x: 0.78, y: 0.62, w: 0.08, h: 0.05, color: "#78716c" }],
  },
  {
    key: "sewer", emoji: "🕳️", name: "A Storm Drain", rarity: "rare", value: -4,
    sky: ["#1c1917", "#365314"], ground: "#1c1917",
    effect: { type: "fog", layer: "front", params: { color: "#84cc16", bands: 3, opacity: 0.24, speed: 0.3 } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.22, w: 0.66, h: 0.66, color: "#0c0a09" }, { shape: "rect", x: 0.5, y: 0.7, w: 1.2, h: 0.04, color: "#1c1917" }],
  },
  {
    key: "sulfur", emoji: "🌋", name: "A Sulfur Mine", rarity: "epic", value: -6,
    sky: ["#a16207", "#fde047"], ground: "#713f12",
    effect: { type: "rise", layer: "front", params: { color: "#fef08a", count: 40, speed: 0.7, sway: 2.4, size: 4, glow: true } },
    props: [{ shape: "hills", y: 0.6, h: 0.1, waves: 3, color: "#713f12" }, { shape: "tri", x: 0.2, y: 0.3, w: 0.34, h: 0.34, color: "#854d0e" }],
  },
  {
    key: "fallout", emoji: "☢️", name: "An Exclusion Zone", rarity: "epic", value: -7,
    sky: ["#365314", "#a3a3a3"], ground: "#3f3f46",
    effect: { type: "glitch", layer: "front", params: { color: "#a3e635", intensity: 0.45, scanlines: true } },
    props: [{ shape: "rect", x: 0.16, y: 0.2, w: 0.16, h: 0.5, color: "#3f3f46" }, { shape: "rect", x: 0.84, y: 0.28, w: 0.2, h: 0.42, color: "#27272a" }, { shape: "rect", x: 0.5, y: 0.36, w: 0.1, h: 0.34, color: "#52525b" }],
  },
  {
    key: "cruise", emoji: "🚢", name: "A Listing Cruise Ship", rarity: "epic", value: -6,
    sky: ["#1e3a8a", "#64748b"], ground: "#0f172a",
    effect: { type: "fall", layer: "front", params: { color: "#bfdbfe", shape: "line", count: 46, speed: 3, sway: 0, size: 13, angle: 0.5 } },
    props: [{ shape: "hills", y: 0.72, h: 0.05, waves: 3, color: "#0f172a" }, { shape: "rect", x: 0.5, y: 0.44, w: 0.8, h: 0.2, color: "#e2e8f0", alpha: 0.35 }],
  },
  {
    key: "oilspill", emoji: "🛢️", name: "An Oil Spill", rarity: "epic", value: -6,
    sky: ["#18181b", "#4c1d95"], ground: "#0c0a09",
    effect: { type: "ripple", layer: "back", params: { color: "#a78bfa", rings: 4, speed: 0.4, maxRadius: 200, warp: true } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.74, w: 1.3, h: 0.36, color: "#1e1b4b", alpha: 0.8 }],
  },
  {
    key: "trench", emoji: "🌑", name: "The Bottom of the Ocean", rarity: "legendary", value: -4,
    sky: ["#000000", "#082f49"], ground: "#000000",
    effect: { type: "rise", layer: "front", params: { color: "#38bdf8", count: 18, speed: 0.3, sway: 1.2, size: 3, glow: true } },
    props: [{ shape: "ellipse", x: 0.5, y: 0.9, w: 1.6, h: 0.4, color: "#020617" }],
  },
];

export const BACKGROUNDS = [...SCENES].sort((a, b) => a.key.localeCompare(b.key));
