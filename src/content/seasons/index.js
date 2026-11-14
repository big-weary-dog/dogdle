// Holiday seasons. In the weeks around a holiday, dogs are dealt some of its own traits
// and places on top of the everyday ones (see seasonal() in src/roll.js). Each season is
// one file: its dates, its run-up and run-down, its traits and its backgrounds.
//
// A season's traits and places never spawn outside it, and they aren't part of the
// kennel's collection or the board's progress, which count what can turn up any day.
//
// The order of this list is part of how an in-season dog is dealt: add new seasons at
// the end. Entries inside a season are sorted on their content, as everywhere else.

import { strengthOn, peakOn } from "./calendar.js";
import { THANKSGIVING } from "./thanksgiving.js";
import { HANUKKAH } from "./hanukkah.js";
import { CHRISTMAS } from "./christmas.js";
import { KWANZAA } from "./kwanzaa.js";
import { NEW_YEAR } from "./new-year.js";
import { WINTER_DAYS } from "./winter-days.js";

const byText = (a, b) => a.text.localeCompare(b.text);
const byKey = (a, b) => a.key.localeCompare(b.key);

export const SEASONS = [THANKSGIVING, HANUKKAH, CHRISTMAS, KWANZAA, NEW_YEAR, ...WINTER_DAYS].map((s) => ({
  ...s,
  traits: s.traits.map((t) => ({ ...t, season: s.key })).sort(byText),
  backgrounds: s.backgrounds.map((b) => ({ ...b, season: s.key })).sort(byKey),
}));

export const SEASONAL_TRAITS = SEASONS.flatMap((s) => s.traits);
export const SEASONAL_BACKGROUNDS = SEASONS.flatMap((s) => s.backgrounds);

// The seasons a day falls in, each with its strength (up to 1, on the holiday itself) and
// whether this is one of its peak days.
export const seasonsOn = (dateStr) =>
  SEASONS.map((season) => ({ season, strength: strengthOn(season, dateStr), peak: peakOn(season, dateStr) }))
    .filter((a) => a.strength > 0);
