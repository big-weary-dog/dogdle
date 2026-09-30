// Web accounts against an in-memory KV. What matters: a username and PIN get a browser
// its player back, a wrong PIN gets nothing and is rate-limited, the private id never
// appears anywhere public, and linking to Discord moves the web dogs without re-dealing.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { handleBot } from "../src/bot.js";
import { today } from "../src/roll.js";
import { setLogSink } from "../src/log.js";

setLogSink(() => {});
globalThis.caches ??= { default: { match: async () => null, put: async () => {} } };
globalThis.fetch = async () => { throw new Error("offline"); };

const ORIGIN = "https://dogdle.swampkat.com";
const TOKEN = "test-token-please-ignore";
const WEB = "7c0ffee0-1111-4a4a-9b9b-222233334444";
const SNOWFLAKE = "123456789012345678";
const PIN = ["🐶", "🦴", "🎾", "🐸"];

function makeKV() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const entry = store.get(key);
      if (!entry) return null;
      if (type === "json") return JSON.parse(entry.value);
      if (type === "stream") return new Blob([entry.value]).stream();
      if (type === "arrayBuffer") return new Blob([entry.value]).arrayBuffer();
      return entry.value;
    },
    async put(key, value, opts = {}) {
      store.set(key, { value, metadata: opts.metadata ?? null });
    },
    async getWithMetadata(key) {
      const entry = store.get(key);
      return { value: entry?.value ?? null, metadata: entry?.metadata ?? null };
    },
    async delete(key) { store.delete(key); },
    async list({ prefix }) {
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).sort()
        .map((name) => ({ name, metadata: store.get(name).metadata }));
      return { keys, list_complete: true };
    },
  };
}

const env = () => ({
  STORE: makeKV(),
  BOT_TOKEN: TOKEN,
  ASSETS: { fetch: async () => new Response("<html><head><title>x</title></head></html>") },
});

const site = (e, path, body) => worker.fetch(new Request(`${ORIGIN}${path}`, body === undefined ? {} : {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), e);

const bot = (e, route, body) => {
  const url = new URL(`${ORIGIN}/api/bot/${route}`);
  return handleBot(new Request(url, {
    method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(body),
  }), url, e);
};

// A web player with two days of dogs, claimed as "Molossus".
async function claimed() {
  const e = env();
  const roll = async (date) => {
    const { rollDailyDog } = await import("../src/roll.js");
    const { boardRow, rollKey, dayKey } = await import("../src/keys.js");
    const dog = { ...rollDailyDog(WEB, date), player: "Molossus" };
    await e.STORE.put(rollKey(WEB, date), JSON.stringify(dog), { metadata: { date, score: dog.score } });
    await e.STORE.put(dayKey(date, WEB), "", { metadata: boardRow("Molossus", dog) });
  };
  await roll("2026-09-01");
  await roll("2026-09-02");
  const res = await site(e, "/api/account/claim", { player: WEB, username: "Molossus", pin: PIN });
  assert.equal(res.status, 200);
  return e;
}

test("a claimed browser signs in anywhere with its username and PIN", async () => {
  const e = await claimed();
  assert.deepEqual(await (await site(e, `/api/account?player=${WEB}`)).json(),
    { username: "molossus", handle: "Molossus", discord: false, kennel: "/kennel/molossus" });

  const login = await (await site(e, "/api/account/login", { username: "MOLOSSUS", pin: PIN })).json();
  assert.equal(login.player, WEB, "usernames are case-insensitive, and the PIN gives the id back");

  const stored = e.STORE.store.get("user:molossus").value;
  assert.ok(!stored.includes("🐶"), "the PIN is stored hashed");
});

test("a username can't be taken twice, or pose as a Discord player", async () => {
  const e = await claimed();
  const again = await site(e, "/api/account/claim", { player: "aaaaaaaa-2222", username: "molossus", pin: PIN });
  assert.equal(again.status, 409);
  const posing = await site(e, "/api/account/claim", { player: "aaaaaaaa-2222", username: "discord123", pin: PIN });
  assert.equal(posing.status, 400);
  const twice = await site(e, "/api/account/claim", { player: WEB, username: "other", pin: PIN });
  assert.equal(twice.status, 409, "one account per player id");
  const odd = await site(e, "/api/account/claim", { player: "aaaaaaaa-2222", username: "fine", pin: ["🐶", "A", "🎾", "🐸"] });
  assert.equal(odd.status, 400, "a PIN only uses the keypad");
  assert.deepEqual(await (await site(e, "/api/account/check?username=Molossus")).json(), { available: false, problem: "taken" });
});

test("wrong PINs are refused, then locked out", async () => {
  const e = await claimed();
  const wrong = ["🐸", "🐸", "🐸", "🐸"];
  for (let i = 0; i < 5; i++) {
    const res = await site(e, "/api/account/login", { username: "molossus", pin: wrong });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).player, undefined);
  }
  const locked = await site(e, "/api/account/login", { username: "molossus", pin: PIN });
  assert.equal(locked.status, 429, "even the right PIN waits out the lock");
});

test("an account's kennel and cards are public by username, never by private id", async () => {
  const e = await claimed();
  const kennel = await site(e, "/api/kennel?player=Molossus");
  assert.equal(kennel.status, 200);
  const body = await kennel.text();
  assert.ok(!body.includes(WEB), "the private id is nowhere in the kennel");
  assert.ok(body.includes(`${ORIGIN}/u/molossus/2026-09-02.gif`));
  assert.ok(body.includes(`${ORIGIN}/u/molossus/album/`));

  const card = await site(e, "/u/molossus/2026-09-01.gif");
  assert.equal(card.status, 200, "a card is drawn from the stored roll");
  assert.equal(card.headers.get("content-type"), "image/gif");
  assert.equal((await site(e, "/u/nobody/2026-09-01.gif")).status, 404);

  const page = await (await site(e, "/kennel/molossus")).text();
  assert.match(page, /og:title" content="Molossus&#39;s Kennel/);
  assert.ok(!page.includes(WEB));

  const mega = await (await site(e, "/api/kennels")).text();
  assert.ok(!mega.includes(WEB), "nor in the mega-kennel");
  assert.ok(mega.includes(`${ORIGIN}/kennel/molossus`));
});

test("linking to Discord moves the web dogs over and deals the same dog on both", async () => {
  const e = await claimed();
  const { rollDailyDog } = await import("../src/roll.js");
  // Discord already has a dog on the 2nd: that day keeps it.
  await bot(e, "roll", { discordId: SNOWFLAKE, displayName: "Mo" });
  const discordToday = JSON.parse(e.STORE.store.get(`roll:discord-${SNOWFLAKE}:${today()}`).value);
  await e.STORE.put(`roll:discord-${SNOWFLAKE}:2026-09-02`, JSON.stringify(rollDailyDog(`discord-${SNOWFLAKE}`, "2026-09-02")), { metadata: { date: "2026-09-02" } });

  const { code } = await (await site(e, "/api/account/link-code", { player: WEB })).json();
  assert.match(code, /^[A-Z2-9]{6}$/);
  const linked = await bot(e, "link", { discordId: SNOWFLAKE, code: code.toLowerCase() });
  assert.equal(linked.status, 200);
  const out = await linked.json();
  assert.equal(out.moved, 1);
  assert.equal(out.kept, 1);

  const movedDog = JSON.parse(e.STORE.store.get(`roll:discord-${SNOWFLAKE}:2026-09-01`).value);
  assert.equal(movedDog.name, rollDailyDog(WEB, "2026-09-01").name, "moved as it was, not re-dealt");
  assert.ok(!e.STORE.store.has(`day:2026-09-01:${WEB}`), "the day's row moved too");
  assert.ok(!e.STORE.store.has(`day:2026-09-02:${WEB}`), "a day Discord kept lists one dog, not two");
  assert.equal(e.STORE.store.get(`day:2026-09-01:discord-${SNOWFLAKE}`).metadata.discordId, SNOWFLAKE);

  const web = await (await site(e, `/api/roll?player=${WEB}`)).json();
  assert.equal(web.name, discordToday.name, "the website now deals the Discord dog");
  assert.equal((await (await site(e, `/api/account?player=${WEB}`)).json()).discord, true);

  const reuse = await bot(e, "link", { discordId: SNOWFLAKE, code });
  assert.equal(reuse.status, 404, "a code works once");
});
