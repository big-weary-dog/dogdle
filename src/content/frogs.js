// Frogs. Every so often the machine doesn't deal a dog at all: a frog has got in.
//
// A frog is an intruder, not a breed. It has no Dog CEO photo (it draws as a big 🐸), no
// dog name, and none of the dog traits. It draws from its own table below instead, which
// is all bad news. A frog averages about -30, which is the point.
//
// Frogs sit outside the dog balance on purpose. The average *dog* is kept at 0, and a frog
// is a tax on top of it: the balance test and `npm run balance` measure dogs only.
//
// Whether today is a frog is decided by its own hash, apart from the dog's generator, so
// adding frogs changed nothing about any day that stayed a dog.

export const FROG_CHANCE = 1 / 40;

// What stands in for the breed. The breed row is always there on a frog: a common dog's
// breed is worth nothing, but being a frog is worth a lot of nothing.
export const FROG = {
  breed: "Intruder",
  label: "Not a Dog",
  color: "#65a30d",
  glow: "0 0 26px rgba(101, 163, 13, 0.85)",
  emoji: "🐸",
  row: "Is a frog",
  value: -12,
};

export const FROG_TRAIT_COUNT_MIN = 4;
export const FROG_TRAIT_COUNT_MAX = 6;

// Picked by index like dog names, so the list is sorted on export.
export const FROG_NAMES = [
  "Slimy Frog", "Vile Frog", "Disgusting Frog", "Moist Frog", "Clammy Frog",
  "Wretched Frog", "Foul Frog", "Loathsome Frog", "Rancid Frog", "Soggy Frog",
  "Treacherous Frog", "Gelatinous Frog", "Repugnant Frog", "Putrid Frog",
  "Suspicious Frog", "Unwanted Frog", "Damp Frog", "Horrid Frog", "Mucous Frog",
  "Bog Frog",
].sort();

const slime = { type: "fall", layer: "front", params: { color: "#84cc16", shape: "dot", count: 22, speed: 0.5, sway: 0.3, size: 4 } };

// Never mixed into the dog traits. Sorted by text on export for the same reason as NAMES.
export const FROG_TRAITS = [
  { text: "Coated in a mysterious slime", emoji: "🧪", value: -4, category: "frog", effect: slime },
  { text: "Leaves a wet print on everything", emoji: "💧", value: -3, category: "frog", effect: null },
  { text: "Ate the dog's dinner. Kept eye contact.", emoji: "🍽️", value: -5, category: "frog", effect: null },
  { text: "Croaks at 3am, directly into your ear", emoji: "🗯️", value: -4, category: "frog",
    effect: { type: "ripple", layer: "back", params: { color: "#4d7c0f", rings: 3, speed: 1.2, maxRadius: 160 } } },
  { text: "Has not blinked since it arrived", emoji: "👀", value: -3, category: "frog",
    effect: { type: "vignette", layer: "front", params: { color: "#052e16", opacity: 0.5 } } },
  { text: "Moist to the touch. Always.", emoji: "💦", value: -4, category: "frog", effect: null },
  { text: "Here to replace your dog", emoji: "🔁", value: -6, category: "frog",
    effect: { type: "glitch", layer: "front", params: { color: "#65a30d", intensity: 0.25, scanlines: true } } },
  { text: "Came up through the drain", emoji: "🚰", value: -4, category: "frog", effect: null },
  { text: "Poisonous. Won't say which part.", emoji: "☠️", value: -5, category: "frog",
    effect: { type: "pulse", layer: "back", params: { color: "#a3e635", period: 1400, radius: 170 } } },
  { text: "Sits in the water bowl on purpose", emoji: "🪣", value: -3, category: "frog", effect: null },
  { text: "Claims squatter's rights", emoji: "🏚️", value: -4, category: "frog", effect: null },
  { text: "Smells like a pond in August", emoji: "🦠", value: -4, category: "frog",
    effect: { type: "fog", layer: "front", params: { color: "#65a30d", bands: 3, opacity: 0.3, speed: 0.3 } } },
  { text: "Licked every light switch in the house", emoji: "💡", value: -3, category: "frog", effect: null },
  { text: "Warty, and proud of it", emoji: "🍄", value: -2, category: "frog", effect: null },
  { text: "Spawned in the paddling pool. Hundreds.", emoji: "🥚", value: -6, category: "frog",
    effect: { type: "rise", layer: "front", params: { color: "#1c1917", shape: "dot", count: 30, speed: 0.4, sway: 1.2, size: 3 } } },
  { text: "Legally a toad in three states", emoji: "🧾", value: -2, category: "frog", effect: null },
  { text: "No teeth. Bites anyway.", emoji: "🩸", value: -4, category: "frog", effect: null },
  { text: "Glistening menacingly", emoji: "✨", value: -3, category: "frog",
    effect: { type: "stars", layer: "front", params: { color: "#bef264", count: 24 } } },
  { text: "Ribbits in a tone of contempt", emoji: "😒", value: -3, category: "frog", effect: null },
  { text: "Was in the kettle", emoji: "🫖", value: -5, category: "frog", effect: null },
  { text: "Wants a kiss. Will not become a prince.", emoji: "💋", value: -4, category: "frog",
    effect: { type: "fall", layer: "front", params: { color: "#4d7c0f", shape: "heart", count: 10, speed: 0.6, sway: 1.2, size: 9 } } },
  { text: "Absorbed a smaller frog", emoji: "🌀", value: -5, category: "frog", effect: null },
  { text: "Stole a dog's collar. Answers to Biscuit.", emoji: "🪪", value: -5, category: "frog", effect: null },
  { text: "From the swamp. Going back. Taking something.", emoji: "🌿", value: -4, category: "frog", effect: null },
  { text: "Rain follows it indoors", emoji: "🌧️", value: -3, category: "frog",
    effect: { type: "fall", layer: "front", params: { color: "#93c5fd", shape: "line", count: 40, speed: 2.2, sway: 0, size: 9 } } },
  { text: "Tongue reaches the other side of the room", emoji: "🎣", value: -3, category: "frog", effect: null },
  { text: "Remembers you. Plans to return.", emoji: "📅", value: -4, category: "frog", effect: null },
  { text: "Unsettlingly calm", emoji: "🧘", value: -2, category: "frog", effect: null },
  { text: "Fought a dog. Frog won.", emoji: "🥊", value: -6, category: "frog",
    effect: { type: "shake", layer: "front", params: { intensity: 2, period: 900 } } },
  { text: "Faintly radioactive green", emoji: "☢️", value: -4, category: "frog",
    effect: { type: "tint", layer: "subject", params: { sepia: 0.3, hue: 60, saturate: 1.8 } } },
].sort((a, b) => a.text.localeCompare(b.text));
