// Things it does, repeatedly, whatever anyone says about it.
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

export const HABIT = [
  { text: "Eats drywall", emoji: "🧱", value: -4, category: "habit",
    effect: { type: "fall", layer: "front", params: { color: "#e5e7eb", shape: "dot", count: 26, speed: 1.2, sway: 0.8, size: 3 } } },
  { text: "Has learned to open doors", emoji: "🚪", value: -1, category: "habit", effect: null },

  { text: "Zoomies at 3am", emoji: "💨", value: -1, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 280 } } },
  { text: "Steals food off the counter", emoji: "🥩", value: -4, category: "habit", effect: null },
  { text: "Digs holes in the yard", emoji: "🕳️", value: -1, category: "habit",
    effect: { type: "fall", layer: "front", params: { color: "#92400e", shape: "square", count: 30, speed: 1.3, sway: 0.6, size: 5 } } },
  { text: "Rolls in dead things", emoji: "🦨", value: -4, category: "habit",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.6, hue: 60, saturate: 0.7 } } },
  { text: "Chases his tail for hours", emoji: "🌀", value: -1, category: "habit",
    effect: { type: "spin", layer: "subject", params: { period: 3500 } } },
  { text: "Screams instead of barking", emoji: "😱", value: 0, category: "habit", group: "voice",
    effect: { type: "ripple", layer: "back", params: { color: "#fca5a5", rings: 4, speed: 1.4, maxRadius: 170 } } },
  { text: "Sleeps in an upsetting position", emoji: "🛌", value: 0, category: "habit", group: "sleep",
    effect: { type: "squish", layer: "subject", params: { period: 1600 } } },
  { obsolete: true, text: "Waits by the door all day", emoji: "🚪", value: 1, category: "habit", effect: null },
  { obsolete: true, text: "Never once had an accident indoors", emoji: "✨", value: 3, category: "habit", effect: null },
  { text: "Knows one trick and does it constantly", emoji: "🔂", value: 0, category: "habit",
    effect: { type: "bounce", layer: "subject", params: { period: 700 } } },
  { text: "Stares at the wall for long periods", emoji: "🧱", value: -1, category: "habit",
    effect: { type: "vignette", layer: "front", params: { color: "#1c1917", opacity: 0.5 } } },
  { text: "Dreams violently", emoji: "💤", value: -1, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 420 } } },
  { text: "Gambling addiction", emoji: "🎰", value: -5, category: "habit",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 30, spread: 150, confetti: true } } },
  { text: "Always drunk", emoji: "🍺", value: -4, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 1400 } } },
  { text: "Forgot to eat lunch", emoji: "🥪", value: -1, category: "habit", effect: null },
  { text: "Escapes any enclosure", emoji: "🪄", value: -4, category: "habit",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.8 } } },
  { text: "Expensive tastes", emoji: "💸", value: -1, category: "habit",
    effect: { type: "burst", layer: "front", params: { color: "#4ade80", count: 22, spread: 130 } } },
  { text: "Steals from shops", emoji: "🛒", value: -4, category: "habit",
    effect: { type: "glitch", layer: "front", params: { color: "#fbbf24", intensity: 0.3, scanlines: false } } },
  { text: "Doesn\'t return the shopping cart", emoji: "🛒", value: -5, category: "habit",
    effect: { type: "spotlight", layer: "front", params: { color: "#e5e7eb", radius: 105, speed: 0.75 } } },
  // The car, sleep and diet: one of each per dog.
  { text: "Loves the car more than you", emoji: "🚗", value: 1, category: "habit", group: "car", effect: null },
  { text: "Carsick within one street", emoji: "🤮", value: -3, category: "habit", group: "car",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.4, hue: 70, saturate: 1.3 } } },
  { text: "Head out the window, ears inside out", emoji: "🪟", value: 2, category: "habit", group: "car", effect: null },
  { text: "Can drive. Shouldn't.", emoji: "🛞", value: -2, category: "habit", group: "car",
    effect: { type: "shake", layer: "front", params: { intensity: 2, period: 700 } } },
  { text: "Sleeps under the covers, head on the pillow", emoji: "🛏️", value: 2, category: "habit", group: "sleep", effect: null },
  { text: "Sleeps standing up, like a horse", emoji: "🧍", value: -1, category: "habit", group: "sleep", effect: null },
  { text: "Sleeps twenty hours a day", emoji: "😴", value: 0, category: "habit",
    effect: { type: "rise", layer: "front", params: { color: "#c7d2fe", count: 10, speed: 0.5, sway: 1, size: 5 } } },
  { text: "Has never been seen asleep", emoji: "👁️", value: -4, category: "habit",
    effect: { type: "vignette", layer: "front", params: { color: "#0f172a", opacity: 0.45 } } },
  { text: "Vegan. Not by choice.", emoji: "🥦", value: -2, category: "habit", group: "diet",
    effect: { type: "fall", layer: "front", params: { color: "#4ade80", shape: "leaf", count: 14, speed: 0.9, sway: 1.5, size: 5 } } },
  { text: "Raw diet. Owner won't stop talking about it.", emoji: "🥩", value: -1, category: "habit", group: "diet", effect: null },
  { text: "Eats better than the family", emoji: "🍝", value: 2, category: "habit", group: "diet", effect: null },
  { text: "Same kibble since 2014", emoji: "🥣", value: 0, category: "habit", group: "diet", effect: null },
  { text: "Eats one kibble at a time, carried to the rug", emoji: "🍚", value: -1, category: "habit", effect: null },
  { text: "Only watches nature documentaries", emoji: "📺", value: 1, category: "habit", effect: null },
];
