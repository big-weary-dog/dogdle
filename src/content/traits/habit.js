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
  { text: "Zoomies at 3am", emoji: "💨", value: -1, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 280 } } },
  { text: "Steals food off the counter", emoji: "🥩", value: -2, category: "habit", effect: null },
  { text: "Digs holes in the yard", emoji: "🕳️", value: -2, category: "habit",
    effect: { type: "fall", layer: "front", params: { color: "#92400e", shape: "square", count: 30, speed: 1.3, sway: 0.6, size: 5 } } },
  { text: "Rolls in dead things", emoji: "🦨", value: -2, category: "habit",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.6, hue: 60, saturate: 0.7 } } },
  { text: "Chases his tail for hours", emoji: "🌀", value: -2, category: "habit",
    effect: { type: "spin", layer: "subject", params: { period: 3500 } } },
  { text: "Screams instead of barking", emoji: "😱", value: 0, category: "habit",
    effect: { type: "ripple", layer: "back", params: { color: "#fca5a5", rings: 4, speed: 1.4, maxRadius: 170 } } },
  { text: "Sleeps in an upsetting position", emoji: "🛌", value: 0, category: "habit",
    effect: { type: "squish", layer: "subject", params: { period: 1600 } } },
  { obsolete: true, text: "Waits by the door all day", emoji: "🚪", value: 1, category: "habit", effect: null },
  { obsolete: true, text: "Never once had an accident indoors", emoji: "✨", value: 3, category: "habit", effect: null },
  { text: "Knows one trick and does it constantly", emoji: "🔂", value: 0, category: "habit",
    effect: { type: "bounce", layer: "subject", params: { period: 700 } } },
  { text: "Stares at the wall for long periods", emoji: "🧱", value: -2, category: "habit",
    effect: { type: "vignette", layer: "front", params: { color: "#1c1917", opacity: 0.5 } } },
  { text: "Dreams violently", emoji: "💤", value: -1, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 420 } } },
  { text: "Gambling addiction", emoji: "🎰", value: -3, category: "habit",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 30, spread: 150, confetti: true } } },
  { text: "Always drunk", emoji: "🍺", value: -2, category: "habit",
    effect: { type: "wobble", layer: "subject", params: { period: 1400 } } },
  { text: "Forgot to eat lunch", emoji: "🥪", value: -1, category: "habit", effect: null },
  { text: "Escapes any enclosure", emoji: "🪄", value: -2, category: "habit",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.8 } } },
  { text: "Expensive tastes", emoji: "💸", value: -2, category: "habit",
    effect: { type: "burst", layer: "front", params: { color: "#4ade80", count: 22, spread: 130 } } },
  { text: "Steals from shops", emoji: "🛒", value: -3, category: "habit",
    effect: { type: "glitch", layer: "front", params: { color: "#fbbf24", intensity: 0.3, scanlines: false } } },
  { text: "Doesn\'t return the shopping cart", emoji: "🛒", value: -3, category: "habit",
    effect: { type: "spotlight", layer: "front", params: { color: "#e5e7eb", radius: 105, speed: 0.75 } } },
];
