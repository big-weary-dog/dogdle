// Everything that dresses up a dog: its name, the scene it's standing in, and the traits
// stacked on top. Backgrounds and traits both feed the dog score.
//
// This file is only a barrel. The tables live next to it, one file per kind:
//
//   names.js          the name pool (plus dog-names.js, real names off dog licences)
//   backgrounds.js    scenes and their rarity weights
//   tiers.js          the nine quality tiers
//   traits/<kind>.js  one file per trait category
//   frogs.js          the intruders: their names and their own traits
//
// Nothing here depends on the order entries sit in those files -- see traits/index.js.

export { NAMES } from "./names.js";
export { BACKGROUNDS, BACKGROUND_WEIGHTS } from "./backgrounds.js";
export { QUALITY_TIERS } from "./tiers.js";
export { MODIFIERS, MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX } from "./traits/index.js";
export {
  FROG, FROG_CHANCE, FROG_NAMES, FROG_TRAITS, FROG_TRAIT_COUNT_MIN, FROG_TRAIT_COUNT_MAX, FROG_PHOTOS,
} from "./frogs.js";
