// The trait pool, assembled from one file per category.
//
// Sorted by text, deliberately. The generator picks traits by index, so before this the
// order entries happened to sit in a source file decided which dog everyone got -- moving
// a trait between files re-dealt every future roll. Sorting on the content itself makes
// the layout of these files irrelevant to the game.

import { HEALTH } from "./health.js";
import { TEMPERAMENT } from "./temperament.js";
import { HABIT } from "./habit.js";
import { CONDITION } from "./condition.js";
import { CIRCUMSTANCE } from "./circumstance.js";

export const MODIFIERS = [
  ...HEALTH,
  ...TEMPERAMENT,
  ...HABIT,
  ...CONDITION,
  ...CIRCUMSTANCE,
].sort((a, b) => a.text.localeCompare(b.text));

// Traits per dog: varies so cards aren't uniform, averaging 6.
export const MODIFIER_COUNT_MIN = 4;
export const MODIFIER_COUNT_MAX = 8;
