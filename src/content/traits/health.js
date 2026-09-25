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
  // ----- the nose: one relationship to scent, and it is the whole animal -----
  { text: "Can smell fear", emoji: "😰", value: 3, category: "health", group: "nose",
    effect: { type: "fog", layer: "front", params: { color: "#e2e8f0", density: 0.35, speed: 0.3 } } },
  { text: "Can smell cancer. Has told no one.", emoji: "🎗️", value: 5, category: "health", group: "nose",
    effect: { type: "halo", layer: "subject", params: { color: "#c084fc", size: 14 } } },
  { text: "Nose doesn't work", emoji: "👃", value: -4, category: "health", group: "nose",
    effect: { type: "drain", layer: "subject", params: { amount: 0.5 } } },
  { text: "Can find anything except the ball", emoji: "🔎", value: -1, category: "health", group: "nose", effect: null },
  { text: "Tracks you through the house", emoji: "🐾", value: 1, category: "health", group: "nose", effect: null },
  { text: "Smelled something once and never recovered", emoji: "🤢", value: -2, category: "health", group: "nose",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.25, hue: 90, saturate: 1.1 } } },

  // ----- speed: how the animal moves, or fails to -----
  { text: "Faster than you. Much faster.", emoji: "💨", value: 2, category: "health", group: "speed",
    effect: { type: "chromatic", layer: "subject", params: { offset: 3 } } },
  { text: "Cannot do stairs", emoji: "🪜", value: -3, category: "health", group: "speed", effect: null },
  { text: "Jumps a six-foot fence, unprompted", emoji: "🦘", value: 0, category: "health", group: "speed",
    effect: { type: "bounce", layer: "subject", params: { period: 700 } } },
  { text: "Runs like something is wrong", emoji: "🫨", value: -2, category: "health", group: "speed",
    effect: { type: "wobble", layer: "subject", params: { period: 600 } } },
  { text: "Tires after eleven metres", emoji: "🔋", value: -2, category: "health", group: "speed", effect: null },

  { text: "Has malaria", emoji: "🦟", value: -6, category: "health",
    effect: { type: "drain", layer: "subject", params: { amount: 0.7 } } },
  { text: "Worms", emoji: "🪱", value: -4, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.4, hue: 40, saturate: 0.8 } } },
  { text: "Hip dysplasia", emoji: "🦴", value: -5, category: "health", effect: null },
  { text: "Blind in one eye", emoji: "👁️", value: -4, category: "health",
    effect: { type: "vignette", layer: "front", params: { color: "#000000", opacity: 0.55 } } },
  { text: "Three legs", emoji: "🦿", value: -1, category: "health",
    effect: { type: "wobble", layer: "subject", params: { period: 900 } } },
  { text: "Ate a sock. Surgically removed.", emoji: "🧦", value: -5, category: "health", effect: null },
  { text: "$400 a month in medication", emoji: "💊", value: -5, category: "health", effect: null },
  { text: "Eternal hunger", emoji: "🍖", value: -5, category: "health", effect: null },
  { text: "Perfect bloodwork", emoji: "🩸", value: 3, category: "health",
    effect: { type: "halo", layer: "subject", params: { color: "#4ade80", size: 12 } } },
  { text: "Insured, thankfully", emoji: "📋", value: 2, category: "health", effect: null },
  { text: "Deaf, but coping", emoji: "👂", value: -1, category: "health",
    effect: { type: "blur", layer: "subject", params: { amount: 1 } } },
  { text: "Vet says he's fine. He is not fine.", emoji: "🩺", value: -4, category: "health",
    effect: { type: "chromatic", layer: "subject", params: { offset: 2 } } },
  { text: "Ate a bee", emoji: "🐝", value: -1, category: "health",
    effect: { type: "squish", layer: "subject", params: { period: 1100 } } },
  { text: "Ate a bee. Again.", emoji: "🐝", value: -3, category: "health",
    effect: { type: "squish", layer: "subject", params: { period: 800 } } },
  { text: "Allergic to other dogs", emoji: "🤧", value: -5, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.3, hue: 320, saturate: 1.3 } } },
  { text: "Ate something at the park. Unclear what.", emoji: "❓", value: -4, category: "health",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.5, hue: 90, saturate: 0.9 } } },
  { text: "Experimental test subject", emoji: "🧪", value: -5, category: "health",
    effect: { type: "chromatic", layer: "subject", params: { offset: 3 } } },
  { text: "Shits itself sometimes", emoji: "💩", value: -5, category: "health",
    effect: { type: "fall", layer: "front", params: { color: "#78350f", shape: "dot", count: 16, speed: 1.6, sway: 0.8, size: 6 } } },
  { text: "Unusually large brain", emoji: "🧠", value: 5, category: "health", group: "mind",
    effect: { type: "pulse", layer: "back", params: { color: "#c084fc", period: 2200, radius: 175 } } },
];
