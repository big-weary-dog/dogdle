// Holiday seasons: the calendar, how generously a season deals, and what it must never do
// -- spawn out of season, re-deal a day outside every window, take a puppy's inheritance,
// tilt the average dog, or leak into the collection.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rollDailyDog, rollPuppy, today } from "../src/roll.js";
import {
  SEASONS, SEASONAL_TRAITS, SEASONAL_BACKGROUNDS, seasonsOn, MODIFIERS, FROG_TRAITS, BACKGROUNDS,
} from "../src/content/index.js";
import { strengthOn, nthWeekday } from "../src/content/seasons/calendar.js";
import { HANUKKAH_EVES } from "../src/content/seasons/hanukkah.js";
import { LIVE_TRAITS, PLACE_KEYS } from "../src/progress.js";
import { RARITY_ORDER } from "../src/breeds.js";

const season = (key) => SEASONS.find((s) => s.key === key);
const CATEGORIES = new Set(MODIFIERS.map((m) => m.category));

// Every day from one date to another, inclusive.
function days(from, to) {
  const out = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

test("Thanksgiving is the fourth Thursday of November, three weeks out to a week after", () => {
  assert.equal(nthWeekday(2026, 11, 4, 4), "2026-11-26");
  assert.equal(nthWeekday(2027, 11, 4, 4), "2027-11-25");
  assert.equal(nthWeekday(2028, 11, 4, 4), "2028-11-23");
  const tg = season("thanksgiving");
  assert.equal(strengthOn(tg, "2026-11-04"), 0);
  assert.ok(strengthOn(tg, "2026-11-05") > 0, "the run-up starts three weeks out");
  assert.equal(strengthOn(tg, "2026-11-26"), 1);
  assert.ok(strengthOn(tg, "2026-11-12") < strengthOn(tg, "2026-11-19"), "it builds toward the day");
  assert.ok(strengthOn(tg, "2026-12-03") > 0, "and lingers a week");
  assert.equal(strengthOn(tg, "2026-12-04"), 0);
});

test("a window that crosses New Year is found from both sides", () => {
  assert.ok(strengthOn(season("christmas"), "2027-01-01") > 0);
  assert.equal(strengthOn(season("new-year"), "2027-01-01"), 1);
  assert.equal(strengthOn(season("new-year"), "2026-12-31"), 1);
  assert.equal(strengthOn(season("kwanzaa"), "2027-01-01"), 1);
  assert.equal(strengthOn(season("kwanzaa"), "2027-01-02"), 0);
});

test("the Hanukkah table agrees with the Hebrew calendar, and runs well ahead", () => {
  // The first candle is lit the evening before 25 Kislev.
  const hebrew = new Intl.DateTimeFormat("en-u-ca-hebrew", { timeZone: "UTC", day: "numeric", month: "long" });
  for (const [year, eve] of Object.entries(HANUKKAH_EVES)) {
    const next = new Date(`${eve}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const parts = Object.fromEntries(hebrew.formatToParts(next).map((p) => [p.type, p.value]));
    assert.deepEqual([parts.month, parts.day], ["Kislev", "25"], `Hanukkah ${year}: ${eve} isn't the eve of 25 Kislev`);
    assert.equal(eve.slice(0, 4), year);
  }
  const last = Math.max(...Object.keys(HANUKKAH_EVES).map(Number));
  assert.ok(last >= +today().slice(0, 4) + 5, `the Hanukkah table ends in ${last}: extend it`);
});

test("every season's own dates are real days, and its dials make sense", () => {
  for (const s of SEASONS) {
    for (const y of [2026, 2027, 2028]) {
      const d = s.date(y);
      assert.match(d, /^\d{4}-\d{2}-\d{2}$/, `${s.key} ${y}`);
      assert.equal(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), d, `${s.key} ${y}: ${d} isn't a date`);
    }
    assert.ok(s.days >= 1 && s.before >= 0 && s.after >= 0, `${s.key} has a bad window`);
    assert.ok(s.name && s.emoji, `${s.key} needs a name and an emoji`);
  }
  assert.equal(new Set(SEASONS.map((s) => s.key)).size, SEASONS.length, "season keys are unique");
});

test("seasonal content is its own, and fully specified", () => {
  const everyday = new Set([...MODIFIERS, ...FROG_TRAITS].map((m) => m.text));
  for (const t of SEASONAL_TRAITS) {
    assert.ok(!everyday.has(t.text), `"${t.text}" is already an everyday trait`);
    assert.ok(CATEGORIES.has(t.category), `"${t.text}" has an unknown category: ${t.category}`);
    assert.ok(!t.group, `"${t.text}": seasonal traits don't take groups`);
  }
  const keys = new Set(BACKGROUNDS.map((b) => b.key));
  for (const b of SEASONAL_BACKGROUNDS) {
    assert.ok(!keys.has(b.key), `${b.key} is already an everyday background`);
    assert.ok(RARITY_ORDER.includes(b.rarity), `${b.key}: bad rarity`);
  }
  for (const s of SEASONS) assert.ok(s.traits.length >= 4, `${s.key} needs a few traits to deal from`);
});

test("a day outside every window deals no seasonal anything", () => {
  for (const date of ["2026-09-19", "2026-11-04", "2027-07-04"]) {
    assert.deepEqual(seasonsOn(date), []);
    for (let i = 0; i < 300; i++) {
      const dog = rollDailyDog(`off-season-${i}`, date);
      assert.ok(!dog.background.season && dog.modifiers.every((m) => !m.season), `${date}: a seasonal find out of season`);
    }
  }
});

test("in a window, every dog gets the holiday, and more of it the closer the day", () => {
  const rate = (date) => {
    let traits = 0;
    let places = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const dog = rollDailyDog(`in-season-${i}`, date);
      if (dog.frog) continue;
      const own = dog.modifiers.filter((m) => m.season);
      assert.ok(own.length >= 1, `${date}: a dog with no holiday trait`);
      for (const m of own) assert.ok(seasonsOn(date).some((a) => a.season.key === m.season), `${date}: ${m.text} is out of season`);
      traits += own.length;
      if (dog.background.season) places++;
    }
    return { traits: traits / n, places: places / n };
  };
  const early = rate("2026-11-05");
  const day = rate("2026-11-26");
  assert.ok(day.traits > early.traits + 1, `the day (${day.traits}) should beat the run-up (${early.traits})`);
  assert.ok(day.places > 0.7, `a holiday place on most dogs on the day: ${day.places}`);
  assert.ok(early.places > 0.2, `and on some from the start: ${early.places}`);
});

test("a puppy in season keeps what it inherited", () => {
  const parent = (id) => ({ dog: rollDailyDog(id, "2026-12-24"), owner: id, kennel: null });
  for (let i = 0; i < 300; i++) {
    const parents = [parent(`ma-${i}`), parent(`pa-${i}`)];
    const pup = rollPuppy(`pup-${i}`, "2026-12-25", parents);
    assert.ok(pup.modifiers.some((m) => m.season), "a seasonal puppy gets the holiday too");
    for (const m of pup.modifiers.filter((x) => x.from !== undefined)) {
      assert.ok(!m.season, "an inherited slot was swapped for a holiday trait");
      const p = parents[m.from].dog;
      assert.ok(p.modifiers.some((x) => x.text === m.text), `"${m.text}" isn't from parent ${m.from}`);
    }
  }
});

test("no season tilts the average dog, from its first day to its last", () => {
  // Every third day across the autumn and winter windows, plus each holiday itself.
  const dates = new Set(days("2026-11-05", "2027-01-02").filter((_, i) => i % 3 === 0));
  for (const s of SEASONS) dates.add(s.date(2026));
  for (const date of [...dates].sort()) {
    const scores = [];
    for (let i = 0; i < 3000; i++) {
      const dog = rollDailyDog(`seasonal-avg-${i}`, date);
      if (!dog.frog) scores.push(dog.score);
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    assert.ok(Math.abs(mean) < 0.5, `the average dog on ${date} scores ${mean.toFixed(3)}, expected ~0`);
  }
});

test("seasonal finds stay out of the collection, so nobody's progress drops", () => {
  for (const t of SEASONAL_TRAITS) assert.ok(!LIVE_TRAITS.has(t.text));
  for (const b of SEASONAL_BACKGROUNDS) assert.ok(!PLACE_KEYS.has(b.key));
});

test("a stored seasonal dog says which season each find came from", () => {
  const dog = rollDailyDog("season-label", "2026-11-26");
  const own = dog.modifiers.filter((x) => x.season);
  assert.ok(own.length >= 1);
  for (const m of own) assert.equal(m.season, "thanksgiving");
  const plain = dog.modifiers.find((x) => !x.season);
  if (plain) assert.ok(!("season" in plain), "an everyday trait carries no season field");
});
