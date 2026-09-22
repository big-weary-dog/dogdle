// What is wrong with the animal, or -- occasionally -- what is right with it.
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

export const HEALTH = [
  { text: "Has malaria", emoji: "🦟", value: -6, category: "health",
    effect: { type: "drain", layer: "subject", params: { amount: 0.7 } } },
  { text: "Worms", emoji: "🪱", value: -4, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.4, hue: 40, saturate: 0.8 } } },
  { text: "Hip dysplasia", emoji: "🦴", value: -3, category: "health", effect: null },
  { text: "Blind in one eye", emoji: "👁️", value: -2, category: "health",
    effect: { type: "vignette", layer: "front", params: { color: "#000000", opacity: 0.55 } } },
  { text: "Three legs", emoji: "🦿", value: -2, category: "health",
    effect: { type: "wobble", layer: "subject", params: { period: 900 } } },
  { text: "Ate a sock. Surgically removed.", emoji: "🧦", value: -3, category: "health", effect: null },
  { text: "$400 a month in medication", emoji: "💊", value: -5, category: "health", effect: null },
  { text: "Eternal hunger", emoji: "🍖", value: -5, category: "health", effect: null },
  { text: "Perfect bloodwork", emoji: "🩸", value: 4, category: "health",
    effect: { type: "halo", layer: "subject", params: { color: "#4ade80", size: 12 } } },
  { text: "Insured, thankfully", emoji: "📋", value: 3, category: "health", effect: null },
  { text: "Deaf, but coping", emoji: "👂", value: -1, category: "health",
    effect: { type: "blur", layer: "subject", params: { amount: 1 } } },
  { text: "Vet says he's fine. He is not fine.", emoji: "🩺", value: -4, category: "health",
    effect: { type: "chromatic", layer: "subject", params: { offset: 2 } } },
  { text: "Ate a bee", emoji: "🐝", value: -1, category: "health",
    effect: { type: "squish", layer: "subject", params: { period: 1100 } } },
  { text: "Ate a bee. Again.", emoji: "🐝", value: -2, category: "health",
    effect: { type: "squish", layer: "subject", params: { period: 800 } } },
  { text: "Allergic to other dogs", emoji: "🤧", value: -4, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.3, hue: 320, saturate: 1.3 } } },
  { text: "Ate something at the park. Unclear what.", emoji: "❓", value: -2, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.5, hue: 90, saturate: 0.9 } } },
  { text: "Experimental test subject", emoji: "🧪", value: -5, category: "health",
    effect: { type: "chromatic", layer: "subject", params: { offset: 3 } } },
  { text: "Shits itself sometimes", emoji: "💩", value: -4, category: "health",
    effect: { type: "fall", layer: "front", params: { color: "#78350f", shape: "dot", count: 16, speed: 1.6, sway: 0.8, size: 6 } } },
  { text: "Unusually large brain", emoji: "🧠", value: 5, category: "health",
    effect: { type: "pulse", layer: "back", params: { color: "#c084fc", period: 2200, radius: 175 } } },
];
