// Frogs. Every so often the machine doesn't deal a dog at all: a frog has got in.
//
// A frog is an intruder, not a breed. It has no Dog CEO photo (it gets a real frog from
// FROG_PHOTOS below, or a big 🐸 if that fails), no dog name, and none of the dog traits.
// It draws from its own table below instead, which is all bad news. A frog averages about
// -30, which is the point.
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

// Real frogs, since Dog CEO has none. Served from public/frogs/ and picked per frog in
// src/photo.js. Every one is openly licensed on Wikimedia Commons and needs its credit
// kept (docs/how-it-works.md lists them). Adding one is safe: a frog's photo is stored when it's
// dealt, so only future frogs see the new set. Fetch candidates with frog-photos.yml.
export const FROG_PHOTOS = [
  { file: "american-toad.jpg", by: "Cephas", license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Bufo_americanus_PJC1.jpg" },
  { file: "blue-poison-dart-frog.jpg", by: "Michael Gäbler", license: "CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Dendrobates_azureus_(Dendrobates_tinctorius)_Edit.jpg" },
  { file: "burrowing-frog-grumpy.jpg", by: "Rushenb", license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Glyphoglossus_molossus,_Blunt-headed_burrowing_frog_-_Hua_Hin_District,_Near_Pala-U.jpg" },
  { file: "burrowing-frog-leaves.jpg", by: "Rushen", license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Glyphoglossus_molossus,_Blunt-headed_burrowing_frog_-_Mueang_Loei_District,_Loei_Province_(47097003944).jpg" },
  { file: "cane-toad.jpg", by: "Wilfredor", license: "CC0",
    source: "https://commons.wikimedia.org/wiki/File:Bufo_marinus_in_Venezuela.jpg" },
  { file: "common-toad.jpg", by: "Korall", license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Bufo_bufo_on_grass2.JPG" },
  { file: "dyeing-poison-frog.jpg", by: "H. Zell", license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Dendrobates_tinctorius_-_Karlsruhe_Zoo_05.jpg" },
  { file: "edible-frog-lily-pad.jpg", by: "Grand-Duc, Niabot (edit)", license: "CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Rana_esculenta_on_Nymphaea_edit.JPG" },
  { file: "golden-mantella.jpg", by: "Charles J. Sharp", license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Variegated_golden_frog_(Mantella_baroni)_Ranomafana.jpg" },
  { file: "marsh-frog-warty.jpg", by: "Andreas Eichler", license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:2017.06.11.-03-Anglerteiche-Rimbach--Seefrosch.jpg" },
  { file: "marsh-frog.jpg", by: "Charles J. Sharp", license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Marsh_frog_(Pelophylax_ridibundus).jpg" },
  { file: "peeking-tree-frog.jpg", by: "Lucas Rosado Mendonça", license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Aplastodiscus_arildae_no_Parque_Estadual_de_Caparao_por_Lucas_Rosado_(03).jpg" },
  { file: "red-eyed-tree-frog-night.jpg", by: "LiquidGhoul edited by Muhammad", license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Red-eyed_Tree_Frog_-_Litoria_chloris_edit1.jpg" },
  { file: "red-eyed-tree-frog.jpg", by: "Careyjamesbalboa (Carey James Balboa)", license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Red_eyed_tree_frog_edit2.jpg" },
  { file: "strawberry-poison-frog.jpg", by: "Rhododendrites", license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Strawberry_poison_dart_frog_(70539).jpg" },
  { file: "water-frog-eye.jpg", by: "Holger Gröschl", license: "CC BY-SA 2.0 de",
    source: "https://commons.wikimedia.org/wiki/File:Waterfrog_head.jpg" },
  { file: "white-lipped-tree-frog-leaf.jpg", by: "Charles J. Sharp", license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:White-lipped_tree_frog_(Nyctimystes_infrafrenatus)_Daintree.jpg" },
  { file: "white-lipped-tree-frog.jpg", by: "JJ Harrison (https://www.jjharrison.com.au/)", license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Litoria_infrafrenata_-_Julatten.jpg" },
];
