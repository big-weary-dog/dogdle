// How it behaves toward people, other dogs, and the world.
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

export const TEMPERAMENT = [
  { text: "Certified therapy dog", emoji: "🪪", value: 5, category: "temperament",
    effect: { type: "pulse", layer: "back", params: { color: "#4ade80", period: 2600, radius: 190 } } },
  { text: "Likes everyone immediately", emoji: "🥰", value: 4, category: "temperament",
    effect: { type: "rise", layer: "front", params: { color: "#fb7185", count: 18, speed: 0.5, sway: 1.8, size: 9, shape: "heart" } } },
  { text: "Comes when called, every time", emoji: "📣", value: 4, category: "temperament",
    effect: { type: "halo", layer: "subject", params: { color: "#38bdf8", size: 10 } } },
  { obsolete: true, text: "Sleeps through the night", emoji: "😴", value: 3, category: "temperament", effect: null },
  { obsolete: true, text: "Good with kids", emoji: "🧒", value: 2, category: "temperament",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 26, spread: 130 } } },
  { text: "Fine with cats", emoji: "🐈", value: 2, category: "temperament", effect: null },
  { text: "Ignores you completely outdoors", emoji: "🙉", value: -2, category: "temperament", effect: null },
  { text: "Barks at nothing for forty minutes", emoji: "📢", value: -2, category: "temperament",
    effect: { type: "shake", layer: "front", params: { intensity: 3, period: 900 } } },
  { text: "Banned from the dog park", emoji: "🚫", value: -5, category: "temperament",
    effect: { type: "glitch", layer: "front", params: { color: "#ef4444", intensity: 0.6, scanlines: false } } },
  { text: "Bit a groomer once", emoji: "🩹", value: -4, category: "temperament",
    effect: { type: "chromatic", layer: "subject", params: { offset: 3 } } },
  { text: "Ate a child", emoji: "💀", value: -9, category: "temperament",
    effect: { type: "invert", layer: "subject", params: { amount: 0.8 } } },
  { text: "Kleptomania", emoji: "💍", value: -4, category: "temperament", effect: null },
  { text: "Afraid of men in hats", emoji: "🎩", value: -2, category: "temperament", effect: null },
  { text: "Afraid of the floor", emoji: "🧊", value: -2, category: "temperament",
    effect: { type: "bounce", layer: "subject", params: { period: 1200 } } },
  { text: "Believes he is a person", emoji: "🧍", value: 1, category: "temperament", effect: null },
  { text: "Knows when you're sad", emoji: "🫂", value: 5, category: "temperament",
    effect: { type: "pulse", layer: "back", params: { color: "#f472b6", period: 2400, radius: 180 } } },
  { text: "Respects the UPS driver, hates the mailman", emoji: "📦", value: 0, category: "temperament", effect: null },
  { text: "Big strong barks", emoji: "📣", value: 4, category: "temperament",
    effect: { type: "ripple", layer: "back", params: { color: "#93c5fd", rings: 4, speed: 1.2, maxRadius: 200 } } },
  { text: "Existential crisis", emoji: "🕳️", value: -2, category: "temperament",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.6, blur: 0.8 } } },
  { text: "Fetch world champion", emoji: "🥇", value: 8, category: "temperament",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 46, spread: 210, confetti: true } } },
  { text: "Fetch regional champion", emoji: "🥈", value: 5, category: "temperament",
    effect: { type: "burst", layer: "front", params: { color: "#cbd5e1", count: 28, spread: 150 } } },
  { text: "Amateur fetch player", emoji: "🎾", value: 2, category: "temperament",
    effect: { type: "burst", layer: "front", params: { color: "#bef264", count: 14, spread: 100 } } },
  { text: "Practicing therapist", emoji: "🛋️", value: 5, category: "temperament",
    effect: { type: "pulse", layer: "back", params: { color: "#4ade80", period: 2800, radius: 190 } } },
  { text: "Homies with da cats", emoji: "🐈", value: 3, category: "temperament", effect: null },
  { text: "Does math for treats", emoji: "🧮", value: 4, category: "temperament",
    effect: { type: "halo", layer: "subject", params: { color: "#38bdf8", size: 12 } } },
];
