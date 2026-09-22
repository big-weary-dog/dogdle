// The state it happens to be in: wearing something, covered in something,
// or quietly violating physics.
//
// Tone: plain and dry. "Has malaria", not "cursed by ancient forces". The comedy is in
// stating a grim or absurd fact flatly next to a number.
//
// Visuals are declarative -- { type, layer, params } -- rendered by public/effects.js:
//   back    -- the world behind the dog
//   front   -- stuff between you and the dog
//   subject -- CSS on the photo itself, so the effect visibly touches the animal
//
// Never delete a trait. Mark it `obsolete: true` -- stored dogs still reference theirs.

export const CONDITION = [
  { text: "Wearing a small hat", emoji: "🎩", value: 3, category: "condition", effect: null },
  { text: "Cone of shame", emoji: "🔺", value: -2, category: "condition",
    effect: { type: "fog", layer: "front", params: { color: "#94a3b8", bands: 2, opacity: 0.3, speed: 0.5 } } },
  { text: "Covered in mud", emoji: "🟤", value: -2, category: "condition",
    effect: { type: "fall", layer: "front", params: { color: "#78350f", shape: "dot", count: 40, speed: 1.4, sway: 1, size: 4.5 } } },
  { text: "Groomed this morning", emoji: "💈", value: 3, category: "condition",
    effect: { type: "halo", layer: "subject", params: { color: "#ffffff", size: 10, brightness: 1.15 } } },
  { text: "Smells, and everyone knows", emoji: "🤢", value: -3, category: "condition",
    effect: { type: "rise", layer: "front", params: { color: "#84cc16", count: 20, speed: 0.4, sway: 2.6, size: 4, glow: true } } },
  { text: "Wearing a sweater someone knitted", emoji: "🧶", value: 3, category: "condition",
    effect: { type: "fall", layer: "front", params: { color: "#fda4af", shape: "dot", count: 22, speed: 0.3, sway: 2, size: 4 } } },
  { text: "Soaking wet", emoji: "💧", value: -1, category: "condition",
    effect: { type: "fall", layer: "front", params: { color: "#93c5fd", shape: "line", count: 34, speed: 2.4, sway: 0, size: 10 } } },
  { text: "Surrounded by bees", emoji: "🐝", value: -4, category: "condition", effect: null },
  { text: "Slightly out of focus, always", emoji: "🌫️", value: -2, category: "condition",
    effect: { type: "blur", layer: "subject", params: { amount: 2.2 } } },
  { text: "Photographs badly", emoji: "📷", value: -1, category: "condition",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.7, hue: 10, saturate: 1.8 } } },
  { text: "Glows faintly. Unexplained.", emoji: "🔮", value: 4, category: "condition",
    effect: { type: "halo", layer: "subject", params: { color: "#22d3ee", size: 18, brightness: 1.2 } } },
  { text: "Technically deceased", emoji: "⚰️", value: -6, category: "condition",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.45, blur: 1.2 } } },
  { text: "Statistically the luckiest dog alive", emoji: "🍀", value: 5, category: "condition",
    effect: { type: "burst", layer: "front", params: { color: "#4ade80", count: 44, spread: 200, confetti: true } } },
  { text: "Cannot be photographed properly", emoji: "📵", value: -2, category: "condition",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.6, blur: 1.4 } } },
  { text: "Smells like a hospital", emoji: "🏥", value: -2, category: "condition",
    effect: { type: "fog", layer: "front", params: { color: "#e0f2fe", bands: 3, opacity: 0.24, speed: 0.35 } } },
  { text: "Has a scar with a story", emoji: "🪡", value: 2, category: "condition", effect: null },
  { text: "One with nature", emoji: "🍃", value: 5, category: "condition",
    effect: { type: "rise", layer: "front", params: { color: "#86efac", count: 24, speed: 0.4, sway: 3, size: 6, shape: "leaf" } } },
  { text: "Devout Buddhist", emoji: "☸️", value: 6, category: "condition",
    effect: { type: "rays", layer: "back", params: { color: "#fde68a", beams: 12, opacity: 0.34, speed: 0.06, holy: true } } },
  { text: "Great at dog magic", emoji: "✨", value: 7, category: "condition",
    effect: { type: "halo", layer: "subject", params: { color: "#c084fc", size: 20, brightness: 1.15 } } },
  { text: "Somehow smells of cigarettes", emoji: "🚬", value: -3, category: "condition",
    effect: { type: "fog", layer: "front", params: { color: "#d6d3d1", bands: 3, opacity: 0.26, speed: 0.3 } } },
  { text: "Appears in two places at once", emoji: "🌀", value: 5, category: "condition",
    effect: { type: "chromatic", layer: "subject", params: { offset: 6 } } },
  { text: "No reflection", emoji: "🪞", value: -5, category: "condition",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.4, blur: 0.5 } } },
];
