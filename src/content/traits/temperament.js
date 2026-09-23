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
  // ----- voice: a dog makes one noise -----
  { text: "Silent. Entirely.", emoji: "🤐", value: -2, category: "temperament", group: "voice", effect: null },
  { text: "One bark, saved for emergencies", emoji: "📢", value: 3, category: "temperament", group: "voice", effect: null },
  { text: "Barks in a different accent", emoji: "🗣️", value: 2, category: "temperament", group: "voice", effect: null },
  { text: "Voice cracks", emoji: "🎤", value: -1, category: "temperament", group: "voice", effect: null },

  // ----- weather: every dog has exactly one opinion about the sky -----
  { text: "Built for snow", emoji: "❄️", value: 2, category: "temperament", group: "weather",
    effect: { type: "fall", layer: "front", params: { color: "#ffffff", shape: "dot", count: 34, speed: 0.7, sway: 2.2, size: 3 } } },
  { text: "Refuses to go out in rain", emoji: "🌧️", value: -2, category: "temperament", group: "weather",
    effect: { type: "fall", layer: "front", params: { color: "#93c5fd", shape: "line", count: 40, speed: 2.4, sway: 0.3, size: 7 } } },
  { text: "Overheats immediately", emoji: "🥵", value: -2, category: "temperament", group: "weather",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.2, hue: 350, saturate: 1.3 } } },
  { text: "Terrified of fireworks", emoji: "🎆", value: -3, category: "temperament", group: "weather",
    effect: { type: "burst", layer: "front", params: { color: "#fbcfe8", count: 26, spread: 140 } } },
  { text: "Unbothered by anything the sky does", emoji: "🌤️", value: 3, category: "temperament", group: "weather", effect: null },

  { text: "Average intelligence. Truly average.", emoji: "📊", value: 0, category: "temperament", group: "mind", effect: null },
  { text: "Cunning", emoji: "🦊", value: 3, category: "temperament", group: "mind",
    effect: { type: "chromatic", layer: "subject", params: { offset: 2 } } },
  { text: "Loyal to the concept of food", emoji: "🥓", value: -1, category: "temperament", group: "loyalty", effect: null },
  { text: "Would die for you, but reluctantly", emoji: "😒", value: 3, category: "temperament", group: "loyalty", effect: null },
  { text: "Refuses to fetch", emoji: "🙅", value: -2, category: "temperament", group: "fetch", effect: null },
  { text: "Fetches. Keeps it.", emoji: "🤲", value: -1, category: "temperament", group: "fetch", effect: null },
  { text: "Perfectly trained", emoji: "🎖️", value: 5, category: "temperament", group: "training",
    effect: { type: "halo", layer: "subject", params: { color: "#4ade80", size: 12 } } },
  { text: "Untrainable", emoji: "🤷", value: -3, category: "temperament", group: "training", effect: null },

  // ----- mind: one assessment of what is going on in there -----
  { text: "Genuinely stupid", emoji: "🪨", value: -3, category: "temperament", group: "mind",
    effect: { type: "blur", layer: "subject", params: { amount: 1 } } },
  { text: "Alarmingly clever", emoji: "🧠", value: 4, category: "temperament", group: "mind",
    effect: { type: "halo", layer: "subject", params: { color: "#38bdf8", size: 12 } } },

  // ----- loyalty: a dog is devoted to exactly one thing, or nothing -----
  { text: "Would die for you", emoji: "🛡️", value: 6, category: "temperament", group: "loyalty",
    effect: { type: "halo", layer: "subject", params: { color: "#4ade80", size: 12 } } },
  { text: "Would not die for you", emoji: "🏃", value: -2, category: "temperament", group: "loyalty", effect: null },
  { text: "Loyal to someone else", emoji: "💔", value: -3, category: "temperament", group: "loyalty",
    effect: { type: "drain", layer: "subject", params: { amount: 0.5 } } },

  { text: "Certified therapy dog", emoji: "🪪", value: 5, category: "temperament", group: "job",
    effect: { type: "pulse", layer: "back", params: { color: "#4ade80", period: 2600, radius: 190 } } },
  { text: "Likes everyone immediately", emoji: "🥰", value: 4, category: "temperament",
    effect: { type: "rise", layer: "front", params: { color: "#fb7185", count: 18, speed: 0.5, sway: 1.8, size: 9, shape: "heart" } } },
  { text: "Comes when called, every time", emoji: "📣", value: 4, category: "temperament", group: "training",
    effect: { type: "halo", layer: "subject", params: { color: "#38bdf8", size: 10 } } },
  { obsolete: true, text: "Sleeps through the night", emoji: "😴", value: 3, category: "temperament", effect: null },
  { obsolete: true, text: "Good with kids", emoji: "🧒", value: 2, category: "temperament",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 26, spread: 130 } } },
  { text: "Fine with cats", emoji: "🐈", value: 2, category: "temperament", group: "cats", effect: null },
  { text: "Ignores you completely outdoors", emoji: "🙉", value: -2, category: "temperament", group: "training", effect: null },
  { text: "Barks at nothing for forty minutes", emoji: "📢", value: -3, category: "temperament",
    effect: { type: "shake", layer: "front", params: { intensity: 3, period: 900 } } },
  { text: "Banned from the dog park", emoji: "🚫", value: -5, category: "temperament",
    effect: { type: "glitch", layer: "front", params: { color: "#ef4444", intensity: 0.6, scanlines: false } } },
  { text: "Bit a groomer once", emoji: "🩹", value: -4, category: "temperament",
    effect: { type: "chromatic", layer: "subject", params: { offset: 3 } } },
  { text: "Ate a child", emoji: "💀", value: -9, category: "temperament",
    effect: { type: "invert", layer: "subject", params: { amount: 0.8 } } },
  { text: "Kleptomania", emoji: "💍", value: -4, category: "temperament", effect: null },
  { text: "Afraid of men in hats", emoji: "🎩", value: -1, category: "temperament", effect: null },
  { text: "Afraid of the floor", emoji: "🧊", value: -3, category: "temperament",
    effect: { type: "bounce", layer: "subject", params: { period: 1200 } } },
  { text: "Believes he is a person", emoji: "🧍", value: 1, category: "temperament", effect: null },
  { text: "Knows when you're sad", emoji: "🫂", value: 5, category: "temperament",
    effect: { type: "pulse", layer: "back", params: { color: "#f472b6", period: 2400, radius: 180 } } },
  { text: "Respects the UPS driver, hates the mailman", emoji: "📦", value: 0, category: "temperament", effect: null },
  { text: "Big strong barks", emoji: "📣", value: 4, category: "temperament", group: "voice",
    effect: { type: "ripple", layer: "back", params: { color: "#93c5fd", rings: 4, speed: 1.2, maxRadius: 200 } } },
  { text: "Existential crisis", emoji: "🕳️", value: -3, category: "temperament",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.6, blur: 0.8 } } },
  { text: "Fetch world champion", emoji: "🥇", value: 8, category: "temperament", group: "fetch",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 46, spread: 210, confetti: true } } },
  { text: "Fetch regional champion", emoji: "🥈", value: 5, category: "temperament", group: "fetch",
    effect: { type: "burst", layer: "front", params: { color: "#cbd5e1", count: 28, spread: 150 } } },
  { text: "Amateur fetch player", emoji: "🎾", value: 2, category: "temperament", group: "fetch",
    effect: { type: "burst", layer: "front", params: { color: "#bef264", count: 14, spread: 100 } } },
  { text: "Practicing therapist", emoji: "🛋️", value: 5, category: "temperament", group: "job",
    effect: { type: "pulse", layer: "back", params: { color: "#4ade80", period: 2800, radius: 190 } } },
  { text: "Homies with da cats", emoji: "🐈", value: 3, category: "temperament", group: "cats", effect: null },
  { text: "Does math for treats", emoji: "🧮", value: 4, category: "temperament",
    effect: { type: "halo", layer: "subject", params: { color: "#38bdf8", size: 12 } } },
];
