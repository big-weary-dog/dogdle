// The board's progress number: how much of the game a player's dogs have turned up. What
// matters: it only counts what can still turn up (no obsolete traits, nothing of a frog's
// but its place), it agrees with the kennel, a board reads it without a value read, a
// player from before it existed is counted from their stored rolls without anything being
// re-dealt, and a web player's id never reaches the public board.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { handleBot, botPlayerId } from "../src/bot.js";
import { buildKennel } from "../src/kennel.js";
import { rollDailyDog, today, isFrogDay } from "../src/roll.js";
import { rollKey, dayKey, boardRow } from "../src/keys.js";
import { BREEDS } from "../src/breeds.js";
import { BACKGROUNDS, MODIFIERS, FROG_TRAITS } from "../src/content/index.js";
import {
  TOTALS, LIVE_TRAITS, addDog, countSeen, progressOf, refreshSeen, recordRoll, boardProgress, seenKey,
  BOARD_BACKFILL_READS,
} from "../src/progress.js";
import { setLogSink } from "../src/log.js";

setLogSink(() => {});
globalThis.caches ??= { default: { match: async () => null, put: async () => {} } };
globalThis.fetch = async () => { throw new Error("offline"); };

const ORIGIN = "https://dogdle.swampkat.com";
const TOKEN = "test-token-please-ignore";
const WEB = "5eed0000-1111-4a4a-9b9b-222233334444";
const SNOWFLAKE = "223456789012345678";

// An in-memory KV that counts what each call costs and pages its lists, so the cursor
// loops run and a test can hold a route to a budget.
function makeKV(pageSize = 1000) {
  const store = new Map();
  const ops = { get: 0, put: 0, list: 0 };
  return {
    store,
    ops,
    async get(key, type) {
      ops.get++;
      const entry = store.get(key);
      if (!entry) return null;
      if (type === "json") return JSON.parse(entry.value);
      if (type === "stream") return new Blob([entry.value]).stream();
      if (type === "arrayBuffer") return new Blob([entry.value]).arrayBuffer();
      return entry.value;
    },
    async put(key, value, opts = {}) {
      ops.put++;
      store.set(key, { value, metadata: opts.metadata ?? null });
    },
    async getWithMetadata(key) {
      ops.get++;
      const entry = store.get(key);
      return { value: entry?.value ?? null, metadata: entry?.metadata ?? null };
    },
    async delete(key) { store.delete(key); },
    async list({ prefix, cursor, limit = pageSize }) {
      ops.list++;
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const n = Math.min(limit, pageSize);
      const keys = all.slice(start, start + n).map((name) => ({ name, metadata: store.get(name).metadata }));
      const done = start + n >= all.length;
      return { keys, list_complete: done, ...(done ? {} : { cursor: String(start + n) }) };
    },
  };
}

const env = (pageSize) => ({
  STORE: makeKV(pageSize),
  BOT_TOKEN: TOKEN,
  ASSETS: { fetch: async () => new Response("<html></html>") },
});

const site = (e, path) => worker.fetch(new Request(`${ORIGIN}${path}`), e);

// Stored rolls on the first `days` days of August, and their board rows, as if the player
// had rolled them before progress existed.
function seedHistory(e, player, days, name = "Old Timer") {
  const dogs = [];
  for (let i = 1; i <= days; i++) {
    const date = `2026-08-${String(i).padStart(2, "0")}`;
    const dog = { ...rollDailyDog(player, date), player: name };
    dogs.push(dog);
    e.STORE.store.set(rollKey(player, date), { value: JSON.stringify(dog), metadata: { date, score: dog.score } });
    e.STORE.store.set(dayKey(date, player), { value: "", metadata: boardRow(name, dog) });
  }
  return dogs;
}

const fresh = () => ({ dates: new Set(), breeds: new Set(), places: new Set(), traits: new Set() });
const findPlayer = (pred) => {
  for (let i = 0; ; i++) {
    const id = `progress-${String(i).padStart(5, "0")}`;
    if (pred(id)) return id;
  }
};

test("the denominator is every breed and place, and every trait that can still spawn", () => {
  const live = MODIFIERS.filter((m) => !m.obsolete);
  assert.ok(live.length < MODIFIERS.length, "the content has obsolete traits, so this test means something");
  assert.equal(TOTALS.traits, new Set(live.map((m) => m.text)).size);
  assert.equal(TOTALS.breeds, BREEDS.length);
  assert.equal(TOTALS.places, BACKGROUNDS.length);
  for (const f of FROG_TRAITS) assert.ok(!LIVE_TRAITS.has(f.text), `frog trait "${f.text}" is not a dog trait`);
  assert.equal(progressOf({}).total, TOTALS.breeds + TOTALS.places + TOTALS.traits);
});

test("an obsolete trait, a frog and a test roll add only what they should", () => {
  const dead = MODIFIERS.find((m) => m.obsolete);
  const alive = MODIFIERS.find((m) => !m.obsolete);
  const seen = fresh();
  addDog(seen, {
    date: "2026-08-01", breed: BREEDS[0].name, background: { key: BACKGROUNDS[0].key },
    modifiers: [{ text: dead.text }, { text: alive.text }],
  });
  assert.deepEqual(countSeen(seen), { breeds: 1, places: 1, traits: 1 }, "the obsolete trait isn't counted");

  // A frog was standing somewhere real, but its breed and traits aren't the dog game's.
  const frogPlayer = findPlayer((id) => isFrogDay(id, "2026-08-02"));
  const frog = rollDailyDog(frogPlayer, "2026-08-02");
  assert.equal(frog.frog, true);
  const f = fresh();
  addDog(f, frog);
  assert.deepEqual(countSeen(f), { breeds: 0, places: 1, traits: 0 });

  const t = fresh();
  addDog(t, { ...rollDailyDog("progress-test-roll", "2026-08-03"), test: true });
  assert.deepEqual(countSeen(t), { breeds: 0, places: 0, traits: 0 });
  assert.ok(t.dates.has("2026-08-03"), "but its date is marked counted, so it isn't read again");
});

test("the percent rounds down, and a stale count can't pass 100%", () => {
  assert.equal(progressOf({ breeds: 0, places: 0, traits: 0 }).percent, 0);
  const all = progressOf({ breeds: TOTALS.breeds, places: TOTALS.places, traits: TOTALS.traits });
  assert.equal(all.percent, 100);
  const over = progressOf({ breeds: 9999, places: 9999, traits: 9999 });
  assert.equal(over.percent, 100);
  assert.equal(over.found, over.total);
  const oneShort = progressOf({ breeds: TOTALS.breeds, places: TOTALS.places, traits: TOTALS.traits - 1 });
  assert.equal(oneShort.percent, 99, "100% means every last one");
});

test("a record built from stored rolls agrees with the kennel, and re-deals nothing", async () => {
  const e = env(7);
  const player = botPlayerId(SNOWFLAKE);
  const dogs = seedHistory(e, player, 20);
  const before = new Map([...e.STORE.store].filter(([k]) => k.startsWith("roll:")).map(([k, v]) => [k, v.value]));

  const { counts, reads, partial } = await refreshSeen(e, player);
  assert.equal(reads, 20);
  assert.equal(partial, false);
  const kennel = buildKennel(dogs);
  assert.deepEqual(counts, { breeds: kennel.breeds.found, places: kennel.backgrounds.found, traits: kennel.traits.found });
  assert.equal(kennel.traits.total, TOTALS.traits, "the kennel and the board share one denominator");

  for (const [k, v] of before) assert.equal(e.STORE.store.get(k).value, v, `${k} was rewritten`);
  const stored = e.STORE.store.get(seenKey(player));
  assert.deepEqual(stored.metadata, counts, "the counts ride in metadata, for the board's list");

  // Up to date: a second refresh reads no rolls and writes nothing.
  const puts = e.STORE.ops.put;
  assert.equal((await refreshSeen(e, player)).reads, 0);
  assert.equal(e.STORE.ops.put, puts);
});

test("a new roll adds the dog in hand without reading the history again", async () => {
  const e = env();
  const player = botPlayerId(SNOWFLAKE);
  seedHistory(e, player, 10);
  await refreshSeen(e, player);

  // The list may not show a key written a moment ago, so the dog is passed in.
  const dog = rollDailyDog(player, "2026-08-11");
  const gets = e.STORE.ops.get;
  await recordRoll(e, player, dog);
  assert.equal(e.STORE.ops.get - gets, 1, "one read: the record itself");
  const record = JSON.parse(e.STORE.store.get(seenKey(player)).value);
  assert.ok(record.dates.includes("2026-08-11"));
  assert.ok(dog.modifiers.every((m) => !LIVE_TRAITS.has(m.text) || record.traits.includes(m.text)));

  // A dog that joined the history later (a link, a meld) is picked up on the next roll.
  const moved = rollDailyDog("some-web-player-id", "2026-07-15");
  e.STORE.store.set(rollKey(player, "2026-07-15"), { value: JSON.stringify(moved), metadata: {} });
  await recordRoll(e, player, rollDailyDog(player, "2026-08-12"));
  const after = JSON.parse(e.STORE.store.get(seenKey(player)).value);
  assert.ok(after.dates.includes("2026-07-15") && after.dates.includes("2026-08-12"));
});

test("a roll never fails because progress couldn't be recorded", async () => {
  const broken = { STORE: { get: async () => null, put: async () => {}, list: async () => { throw new Error("KV down"); } } };
  await recordRoll(broken, "whoever-1234", rollDailyDog("whoever-1234", "2026-08-01"));
});

test("the web board carries each player's progress, and no player id", async () => {
  const e = env();
  const res = await site(e, `/api/roll?player=${WEB}&name=Pip`);
  const dog = await res.json();
  assert.ok(e.STORE.store.has(seenKey(WEB)), "the roll recorded its finds");

  // A Discord player who rolled today, and has a long history from before progress.
  const discord = botPlayerId(SNOWFLAKE);
  seedHistory(e, discord, 30, "Felfox");
  const url = new URL(`${ORIGIN}/api/bot/roll`);
  await handleBot(new Request(url, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ discordId: SNOWFLAKE, displayName: "Felfox" }) }), url, e);

  const board = await (await site(e, "/api/leaderboard")).json();
  const pip = board.rows.find((r) => r.player === "Pip");
  const own = fresh();
  addDog(own, dog);
  assert.deepEqual(pip.progress, progressOf(countSeen(own)));
  assert.ok(pip.progress.percent >= 1);

  const felfox = board.rows.find((r) => r.player === "Felfox");
  const kennel = await (await site(e, `/api/kennel?player=${discord}`)).json();
  assert.equal(felfox.progress.traits.found, kennel.traits.found, "the board and the kennel agree");
  assert.equal(felfox.progress.breeds.found, kennel.breeds.found);
  assert.equal(felfox.progress.places.found, kennel.backgrounds.found);
  assert.ok(felfox.progress.percent > pip.progress.percent, "thirty-one dogs have seen more than one");

  const text = JSON.stringify(board);
  assert.ok(!text.includes(WEB), "a web player's id never reaches the public board");
  assert.ok(!text.includes(SNOWFLAKE), "nor a Discord id");
});

test("a board of players from before progress fills itself in, within a budget", async () => {
  const e = env();
  const date = "2026-08-30";
  const players = Array.from({ length: 12 }, (_, i) => `aaaa0000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  for (const p of players) seedHistory(e, p, 30, `P${p.slice(-2)}`);
  // A smoke test's row is on nobody's board, and gets no record.
  const tester = botPlayerId("900000000000000001");
  seedHistory(e, tester, 1);
  const row = e.STORE.store.get(dayKey("2026-08-01", tester));
  e.STORE.store.set(dayKey(date, tester), { value: "", metadata: { ...row.metadata, test: true } });

  const view = async () => {
    const ops = { ...e.STORE.ops };
    const board = await (await site(e, `/api/leaderboard?date=${date}`)).json();
    const cost = Object.keys(ops).reduce((sum, k) => sum + e.STORE.ops[k] - ops[k], 0);
    return { board, cost };
  };

  // 12 players x 30 dogs is 360 reads, inside one view's budget.
  const first = await view();
  assert.equal(first.board.rows.length, 12);
  assert.ok(first.board.rows.every((r) => r.progress?.percent > 0), "everyone is counted on the first view");
  assert.ok(first.cost < 1000, `the first view stays inside a request's KV budget (${first.cost} ops)`);
  assert.ok(first.cost <= BOARD_BACKFILL_READS + 12 * 3 + 5);
  assert.ok(!e.STORE.store.has(seenKey(tester)), "a test roll's player isn't backfilled");

  // After that, a view is two lists and not a single value read.
  const gets = e.STORE.ops.get;
  const second = await view();
  assert.equal(e.STORE.ops.get, gets, "a settled board reads no values");
  assert.ok(second.cost <= 3, `a settled board is a couple of list calls (${second.cost})`);
  assert.deepEqual(second.board.rows.map((r) => r.progress), first.board.rows.map((r) => r.progress));
});

test("a history too long for one view is finished over the next ones", async () => {
  const e = env();
  const player = "bbbb0000-0000-4000-8000-000000000001";
  // Two years of dogs: more than one view may read.
  for (const y of [2024, 2025]) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        e.STORE.store.set(rollKey(player, date), { value: JSON.stringify(rollDailyDog(player, date)), metadata: {} });
      }
    }
  }
  const total = 2 * 12 * 28;
  assert.ok(total > BOARD_BACKFILL_READS);

  const gets = e.STORE.ops.get;
  const first = await boardProgress(e, [player]);
  assert.ok(e.STORE.ops.get - gets <= BOARD_BACKFILL_READS + 1, "one view keeps to its budget");
  assert.ok(first.get(player).percent > 0, "what's counted so far shows straight away");
  const record = e.STORE.store.get(seenKey(player));
  assert.equal(JSON.parse(record.value).dates.length, BOARD_BACKFILL_READS);
  assert.equal(record.metadata.partial, true);

  // The next view sees it's short and finishes it.
  const second = await boardProgress(e, [player]);
  const done = e.STORE.store.get(seenKey(player));
  assert.equal(JSON.parse(done.value).dates.length, total);
  assert.equal(done.metadata.partial, undefined);
  assert.ok(second.get(player).found >= first.get(player).found);
});

test("a test roll from the bot records nothing", async () => {
  const e = env();
  const url = new URL(`${ORIGIN}/api/bot/roll`);
  await handleBot(new Request(url, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ discordId: SNOWFLAKE, test: true }) }), url, e);
  assert.ok(!e.STORE.store.has(seenKey(botPlayerId(SNOWFLAKE))));
});
