// Facts about its life and situation that have nothing to do with the dog itself.
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

export const CIRCUMSTANCE = [
  // ----- civic life -----
  { text: "Votes", emoji: "🗳️", value: 1, category: "circumstance", effect: null },
  { text: "Has strong opinions about the bin collection", emoji: "🗑️", value: 1, category: "circumstance", effect: null },
  { text: "Attended one protest. Unclear which side.", emoji: "📣", value: 0, category: "circumstance", effect: null },
  { text: "Served on a jury", emoji: "👨‍⚖️", value: 2, category: "circumstance", effect: null },
  { text: "Banned from the community group chat", emoji: "💬", value: -1, category: "circumstance", effect: null },

  // ----- the machine -----
  { text: "In an AI training set", emoji: "🤖", value: 2, category: "circumstance",
    effect: { type: "glitch", layer: "front", params: { color: "#38bdf8", intensity: 0.25, scanlines: true } } },
  { text: "Wearing a GPS collar he has defeated", emoji: "📡", value: -1, category: "circumstance", effect: null },
  { text: "Smart collar reports him to you", emoji: "🔔", value: -1, category: "circumstance", effect: null },
  { text: "Has been mistaken for a robot", emoji: "⚙️", value: -1, category: "circumstance",
    effect: { type: "chromatic", layer: "subject", params: { offset: 2 } } },

  { text: "Owns nothing", emoji: "🫙", value: -1, category: "circumstance", group: "money", effect: null },
  { text: "Paying off a mortgage", emoji: "🏚️", value: -2, category: "circumstance", group: "money", effect: null },
  { text: "Ignored by everyone", emoji: "🫥", value: -1, category: "circumstance", group: "fame",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.8 } } },
  { text: "Night shift security", emoji: "🔦", value: -1, category: "circumstance", group: "job",
    effect: { type: "spotlight", layer: "front", params: { color: "#e5e7eb", radius: 110, speed: 0.9 } } },
  { text: "Unpaid intern", emoji: "☕", value: -2, category: "circumstance", group: "job", effect: null },
  { text: "Same house since birth", emoji: "🏡", value: 3, category: "circumstance", group: "homes", effect: null },
  { text: "Was a gift. Unwanted.", emoji: "🎁", value: -3, category: "circumstance", group: "homes",
    effect: { type: "vignette", layer: "front", params: { color: "#1c1917", opacity: 0.45 } } },

  // ----- money: one financial situation per dog -----
  { text: "Trust fund", emoji: "💰", value: 5, category: "circumstance", group: "money",
    effect: { type: "fall", layer: "front", params: { color: "#fbbf24", shape: "dot", count: 20, speed: 1.1, sway: 1.2, size: 4 } } },
  { text: "In debt", emoji: "📉", value: -3, category: "circumstance", group: "money",
    effect: { type: "vignette", layer: "front", params: { color: "#1c1917", opacity: 0.5 } } },
  { text: "Has a pension, somehow", emoji: "🏦", value: 4, category: "circumstance", group: "money", effect: null },

  // ----- fame: one kind of being known -----
  { text: "Briefly famous online", emoji: "📱", value: 2, category: "circumstance", group: "fame",
    effect: { type: "burst", layer: "front", params: { color: "#bef264", count: 18, spread: 120 } } },
  { text: "Has a Wikipedia page", emoji: "📖", value: 5, category: "circumstance", group: "fame",
    effect: { type: "rays", layer: "back", params: { color: "#fef08a", beams: 10, opacity: 0.3, speed: 0.07 } } },
  { text: "Known to police", emoji: "🚓", value: -4, category: "circumstance", group: "fame",
    effect: { type: "lightning", layer: "front", params: { color: "#93c5fd", frequency: 0.012 } } },

  { text: "Owns the house. Legally.", emoji: "🏠", value: 6, category: "circumstance",
    effect: { type: "spotlight", layer: "front", params: { color: "#fef3c7", radius: 140, speed: 0.3 } } },
  { text: "Has a restraining order", emoji: "⛔", value: -4, category: "circumstance",
    effect: { type: "vignette", layer: "front", params: { color: "#450a0a", opacity: 0.55 } } },

  { text: "Owner is getting divorced", emoji: "💔", value: -4, category: "circumstance",
    effect: { type: "drain", layer: "subject", params: { amount: 0.5 } } },
  { text: "Rehomed twice", emoji: "📦", value: -2, category: "circumstance", group: "homes", effect: null },
  { text: "Was on the news once", emoji: "📺", value: 3, category: "circumstance", group: "fame",
    effect: { type: "spotlight", layer: "front", params: { color: "#fef08a", radius: 130, speed: 0.6 } } },
  { obsolete: true, text: "Lives in a studio apartment", emoji: "🏢", value: -2, category: "circumstance", effect: null },
  { text: "Has a better bed than you", emoji: "🛏️", value: 2, category: "circumstance", effect: null },
  { text: "Named after the owner's ex", emoji: "✏️", value: -1, category: "circumstance", effect: null },
  { obsolete: true, text: "Inherited, along with the house", emoji: "🏚️", value: 1, category: "circumstance", effect: null },
  { text: "Four owners deep", emoji: "🔁", value: -2, category: "circumstance", group: "homes",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.7 } } },
  { text: "Has a LinkedIn", emoji: "💼", value: 2, category: "circumstance",
    effect: { type: "spotlight", layer: "front", params: { color: "#38bdf8", radius: 120, speed: 0.4 } } },
  { text: "Named in a lawsuit", emoji: "⚖️", value: -5, category: "circumstance",
    effect: { type: "glitch", layer: "front", params: { color: "#f87171", intensity: 0.35, scanlines: true } } },
  { text: "Won something in 2019", emoji: "🏆", value: 3, category: "circumstance",
    effect: { type: "burst", layer: "front", params: { color: "#fbbf24", count: 30, spread: 150, confetti: true } } },
  { text: "Has never seen grass", emoji: "🏢", value: -4, category: "circumstance",
    effect: { type: "drain", layer: "subject", params: { amount: 0.6 } } },
  { text: "Has a nemesis", emoji: "😾", value: -3, category: "circumstance", effect: null },
  { text: "Has been to Paris", emoji: "🗼", value: 4, category: "circumstance",
    effect: { type: "rays", layer: "back", params: { color: "#fcd34d", beams: 8, opacity: 0.26, speed: 0.09 } } },
  { text: "Is the reason for the no-dogs rule", emoji: "🚷", value: -4, category: "circumstance",
    effect: { type: "glitch", layer: "front", params: { color: "#fb923c", intensity: 0.4, scanlines: false } } },
  { text: "Appears in a stranger's wedding photos", emoji: "💒", value: 3, category: "circumstance",
    effect: { type: "burst", layer: "front", params: { color: "#fbcfe8", count: 26, spread: 140 } } },
  { text: "Under investigation", emoji: "🔍", value: -5, category: "circumstance",
    effect: { type: "spotlight", layer: "front", params: { color: "#e5e7eb", radius: 110, speed: 0.9 } } },
  { text: "Outlived two previous owners", emoji: "🕰️", value: -2, category: "circumstance", group: "homes",
    effect: { type: "ghost", layer: "subject", params: { opacity: 0.75 } } },
  { text: "First time homeowner", emoji: "🏡", value: 3, category: "circumstance",
    effect: { type: "vignette", layer: "front", params: { color: "#78350f", opacity: 0.35 } } },
  { text: "Megacorporation CEO", emoji: "💼", value: 6, category: "circumstance", group: "job",
    effect: { type: "rays", layer: "back", params: { color: "#fcd34d", beams: 8, opacity: 0.3, speed: 0.08 } } },
  { text: "Supreme Court Justice", emoji: "⚖️", value: 7, category: "circumstance", group: "job",
    effect: { type: "spotlight", layer: "front", params: { color: "#fef3c7", radius: 140, speed: 0.3 } } },
  { text: "Frog Wars veteran", emoji: "🐸", value: 2, category: "circumstance",
    effect: { type: "fall", layer: "front", params: { color: "#4ade80", shape: "dot", count: 22, speed: 0.8, sway: 2.4, size: 5 } } },
  { text: "Rick and Morty superfan", emoji: "🛸", value: -4, category: "circumstance",
    effect: { type: "glitch", layer: "front", params: { color: "#4ade80", intensity: 0.5, scanlines: true } } },
  { text: "Unemployed", emoji: "🛌", value: -2, category: "circumstance", group: "job", effect: null },
  { text: "Raised in a puppy mill", emoji: "🏭", value: -6, category: "circumstance",
    effect: { type: "drain", layer: "subject", params: { amount: 0.75 } } },
  { text: "Dogdle developer", emoji: "👨‍💻", value: 5, category: "circumstance", group: "job",
    effect: { type: "halo", layer: "subject", params: { color: "#22d3ee", size: 14 } } },
  { text: "Local celebrity", emoji: "👑", value: 6, category: "circumstance", group: "fame",
    effect: { type: "spotlight", layer: "front", params: { color: "#fde047", radius: 135, speed: 0.45 } } },
  { text: "Banned from one (1) country", emoji: "🚨", value: -4, category: "circumstance",
    effect: { type: "lightning", layer: "front", params: { color: "#fca5a5", frequency: 0.008 } } },
  { text: "Survived something from space", emoji: "☄️", value: 7, category: "circumstance",
    effect: { type: "rise", layer: "front", params: { color: "#fb923c", count: 30, speed: 1.3, sway: 2, size: 4, glow: true } } },
];
