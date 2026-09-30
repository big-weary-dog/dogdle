// A player's progress: how much of the game their dogs have turned up, as one number --
// the breeds, places and traits they've seen, out of every one that can still turn up.
//
// The board shows it on every row, so it can't be counted from the rolls on each view (a
// read per dog per player). Instead each player has one record,
//
//   seen:<player>   value    { dates, breeds, places, traits }  what has been counted
//                   metadata { breeds, places, traits }         how many of each, live
//
// and the board reads every record's metadata with one list call, never a value. The
// record says which roll dates it has counted, so bringing it up to date only reads the
// rolls it hasn't: a new roll adds the dog already in hand, a record that doesn't exist
// yet (a player from before this) is built on first need, and a dog that joined a history
// later (a Discord link, a meld) is picked up the next time that player rolls. Rolls are
// immutable, so a counted date never needs counting again.

import { BREEDS } from "./breeds.js";
import { BACKGROUNDS, MODIFIERS } from "./content/index.js";
import { rollKey } from "./keys.js";
import { log } from "./log.js";

// Only what can still turn up counts, as in the kennel: an obsolete trait never spawns
// again, so counting it would leave everyone permanently short of complete. A frog's
// traits are its own table and its "breed" isn't one, so neither is in here.
export const LIVE_TRAITS = new Set(MODIFIERS.filter((m) => !m.obsolete).map((m) => m.text));
export const BREED_NAMES = new Set(BREEDS.map((b) => b.name));
export const PLACE_KEYS = new Set(BACKGROUNDS.map((b) => b.key));
export const TOTALS = {
  breeds: BREED_NAMES.size,
  places: PLACE_KEYS.size,
  traits: LIVE_TRAITS.size,
};
const ALL = TOTALS.breeds + TOTALS.places + TOTALS.traits;

export const seenKey = (player) => `seen:${player}`;

// Reads one request may spend building records that don't exist yet. KV allows a thousand
// operations a request; what's left over is picked up by the next board view.
export const BOARD_BACKFILL_READS = 500;
export const BOARD_BACKFILL_PLAYERS = 25;
const ROLL_BACKFILL_READS = 400;

const emptySeen = () => ({ dates: new Set(), breeds: new Set(), places: new Set(), traits: new Set() });

function hydrate(record) {
  const seen = emptySeen();
  if (!record) return seen;
  for (const kind of Object.keys(seen)) for (const item of record[kind] ?? []) seen[kind].add(item);
  return seen;
}

const dehydrate = (seen) => Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v].sort()]));

// What one stored dog adds. A test roll is counted as a date but adds nothing: it doesn't
// count anywhere else either. A frog adds the place it was standing in, which is a real
// place in the game, and nothing else.
export function addDog(seen, dog) {
  seen.dates.add(dog.date);
  if (dog.test) return;
  if (PLACE_KEYS.has(dog.background?.key)) seen.places.add(dog.background.key);
  if (dog.frog) return;
  if (BREED_NAMES.has(dog.breed)) seen.breeds.add(dog.breed);
  for (const m of dog.modifiers ?? []) if (LIVE_TRAITS.has(m.text)) seen.traits.add(m.text);
}

// How many of each kind, out of what's live now.
export function countSeen(seen) {
  const count = (set, live) => [...set].filter((x) => live.has(x)).length;
  return {
    breeds: count(seen.breeds, BREED_NAMES),
    places: count(seen.places, PLACE_KEYS),
    traits: count(seen.traits, LIVE_TRAITS),
  };
}

// The one number: everything seen over everything there is, rounded down, so 100% means
// every last one. Counts are stored when a record is written and the game may have grown
// since, so each is held to today's total.
export function progressOf(counts) {
  const kinds = {};
  let found = 0;
  for (const kind of ["breeds", "places", "traits"]) {
    const n = Math.min(Math.max(0, Number(counts?.[kind]) || 0), TOTALS[kind]);
    kinds[kind] = { found: n, total: TOTALS[kind] };
    found += n;
  }
  return { percent: Math.floor((100 * found) / ALL), found, total: ALL, ...kinds };
}

async function rollDates(env, player) {
  const dates = [];
  let cursor;
  do {
    const listed = await env.STORE.list({ prefix: `roll:${player}:`, cursor });
    dates.push(...listed.keys.map((k) => k.name.split(":").at(-1)));
    cursor = listed.list_complete === false ? listed.cursor : undefined;
  } while (cursor);
  return dates.sort();
}

// Brings a player's record up to date and returns its counts. `dog` is a roll just dealt,
// already in hand -- a list straight after the write may not show it yet. At most `budget`
// rolls are read, newest first; a record left short says so and is finished later.
export async function refreshSeen(env, player, { dog, budget = ROLL_BACKFILL_READS } = {}) {
  const [record, dates] = await Promise.all([env.STORE.get(seenKey(player), "json"), rollDates(env, player)]);
  const seen = hydrate(record);
  const before = seen.dates.size;
  if (dog?.date) addDog(seen, dog);

  const missing = dates.filter((d) => !seen.dates.has(d));
  const reading = missing.slice(-Math.max(0, budget));
  const dogs = await Promise.all(reading.map((d) => env.STORE.get(rollKey(player, d), "json")));
  // A roll that won't read (not visible here yet) stays uncounted and is tried again.
  for (const d of dogs) if (d?.date) addDog(seen, d);

  const counts = countSeen(seen);
  const partial = missing.length > reading.length;
  if (seen.dates.size !== before || !record) {
    try {
      await env.STORE.put(seenKey(player), JSON.stringify(dehydrate(seen)), {
        metadata: { ...counts, ...(partial ? { partial: true } : {}) },
      });
    } catch (err) {
      // KV refuses a second write to one key inside a second; the next refresh redoes it.
      log.warn("progress.store_failed", { player, err });
    }
  }
  return { counts, reads: reading.length, partial };
}

// Called when a roll is stored. Progress is decoration on a dog that's already dealt, so
// nothing here may fail the roll.
export async function recordRoll(env, player, dog) {
  if (dog.test) return;
  try {
    await refreshSeen(env, player, { dog });
  } catch (err) {
    log.warn("progress.record_failed", { player, date: dog.date, err });
  }
}

// Every player's stored counts, from list metadata alone.
async function listSeen(env) {
  const out = new Map();
  let cursor;
  do {
    const listed = await env.STORE.list({ prefix: "seen:", cursor });
    for (const k of listed.keys) if (k.metadata) out.set(k.name.slice("seen:".length), k.metadata);
    cursor = listed.list_complete === false ? listed.cursor : undefined;
  } while (cursor);
  return out;
}

// Progress for each of `players`, by player id. One list for everyone who has a record;
// anyone without one (or with one left short) is brought up to date here, within a budget,
// so a board shows everyone after a view or two however long they've been playing.
// Ids stay server-side: callers put the result on rows that carry no id.
export async function boardProgress(env, players) {
  const out = new Map();
  let known;
  try {
    known = await listSeen(env);
  } catch (err) {
    log.warn("progress.list_failed", { err });
    return out;
  }

  const stale = [];
  for (const player of new Set(players)) {
    const meta = known.get(player);
    if (meta) out.set(player, progressOf(meta));
    if (!meta || meta.partial) stale.push(player);
  }

  let left = BOARD_BACKFILL_READS;
  for (const player of stale.slice(0, BOARD_BACKFILL_PLAYERS)) {
    if (left <= 0) break;
    try {
      const { counts, reads } = await refreshSeen(env, player, { budget: left });
      left -= reads;
      out.set(player, progressOf(counts));
    } catch (err) {
      log.warn("progress.backfill_failed", { player, err });
    }
  }
  if (stale.length) {
    log.info("progress.backfilled", {
      players: Math.min(stale.length, BOARD_BACKFILL_PLAYERS),
      reads: BOARD_BACKFILL_READS - left,
      waiting: Math.max(0, stale.length - BOARD_BACKFILL_PLAYERS),
    });
  }
  return out;
}
