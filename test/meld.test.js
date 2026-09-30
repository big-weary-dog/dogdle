// Melding anonymous web players into Discord players by hand. What matters: the plan never
// shows a web id, a day Discord already has is never merged, nothing is re-dealt, and a
// melded browser rolls as the Discord player from then on.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { handleBot } from "../src/bot.js";
import { similarity } from "../src/meld.js";
import { rollDailyDog } from "../src/roll.js";
import { boardRow, rollKey, dayKey } from "../src/keys.js";
import { setLogSink } from "../src/log.js";

setLogSink(() => {});
globalThis.caches ??= { default: { match: async () => null, put: async () => {} } };
globalThis.fetch = async () => { throw new Error("offline"); };

const ORIGIN = "https://dogdle.swampkat.com";
const TOKEN = "test-token-please-ignore";
const FEL_WEB = "feeeeeee-1111-4a4a-9b9b-222233334444";
const RANDY_WEB = "a0a0a0a0-5555-4a4a-9b9b-666677778888";
const FEL = "111111111111111111";

function makeKV() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const entry = store.get(key);
      if (!entry) return null;
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    async put(key, value, opts = {}) { store.set(key, { value, metadata: opts.metadata ?? null }); },
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

const site = (e, path, body) => worker.fetch(new Request(`${ORIGIN}${path}`, body === undefined ? {} : {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), e);

const bot = (e, route, body) => {
  const url = new URL(`${ORIGIN}/api/bot/${route}`);
  return handleBot(new Request(url, body === undefined
    ? { headers: { authorization: `Bearer ${TOKEN}` } }
    : { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(body) }), url, e);
};

async function put(e, player, name, date, extra = {}) {
  const dog = { ...rollDailyDog(player, date), ...extra, player: name };
  await e.STORE.put(rollKey(player, date), JSON.stringify(dog), { metadata: { date, score: dog.score } });
  await e.STORE.put(dayKey(date, player), "", { metadata: { ...boardRow(name, dog), ...(player.startsWith("discord-") ? { discordId: player.slice(8) } : {}) } });
  return dog;
}

// Fel rolled on the web as "fel_fox" on the 1st-3rd and on Discord as "Felfox" on the 2nd.
// Randy's browser rolled Steve on the 5th -- which was really Fel's, on Randy's phone.
async function world() {
  const e = { STORE: makeKV(), BOT_TOKEN: TOKEN, ASSETS: { fetch: async () => new Response("<html></html>") } };
  for (const d of ["2026-09-01", "2026-09-02", "2026-09-03"]) await put(e, FEL_WEB, "fel_fox", d);
  await put(e, `discord-${FEL}`, "Felfox", "2026-09-02");
  await put(e, RANDY_WEB, "Randy", "2026-09-05", { name: "Steve", breed: "Coonhound", score: 44 });
  return e;
}

test("names that sound alike score high, strangers low", () => {
  assert.ok(similarity("fel_fox", "Felfox") >= 0.85);
  assert.ok(similarity("Phelfocks", "Felfox") >= 0.85);
  assert.ok(similarity("Molossus", "Bethstardust") < 0.5);
});

test("the plan pairs web players with Discord names and never shows a web id", async () => {
  const e = await world();
  const res = await bot(e, "meld?dog=steve");
  const text = await res.clone().text();
  assert.ok(!text.includes(FEL_WEB) && !text.includes(RANDY_WEB));
  const plan = await res.json();
  const fel = plan.anonymous.find((p) => p.name === "fel_fox");
  assert.equal(fel.matches[0].discordId, FEL);
  assert.equal(fel.matches[0].overlap, 1);
  assert.deepEqual(plan.found.map((d) => [d.dog, d.score, d.owner, d.web]), [["Steve", 44, "Randy", true]]);
});

test("a meld moves the web days Discord hadn't rolled, and binds the browser", async () => {
  const e = await world();
  const discordsOwn = e.STORE.store.get(rollKey(`discord-${FEL}`, "2026-09-02")).value;

  const dry = await (await bot(e, "meld", { name: "FEL_FOX", discordId: FEL, dryRun: true })).json();
  assert.deepEqual([dry.moved, dry.kept], [2, 1]);
  assert.ok(!e.STORE.store.has(rollKey(`discord-${FEL}`, "2026-09-01")), "a dry run writes nothing");

  const out = await (await bot(e, "meld", { name: "fel_fox", discordId: FEL })).json();
  assert.deepEqual([out.moved, out.kept, out.bound], [2, 1, 1]);
  assert.equal(e.STORE.store.get(rollKey(`discord-${FEL}`, "2026-09-01")).value,
    e.STORE.store.get(rollKey(FEL_WEB, "2026-09-01")).value, "moved byte for byte");
  assert.equal(e.STORE.store.get(rollKey(`discord-${FEL}`, "2026-09-02")).value, discordsOwn, "Discord's day is never merged");
  assert.ok(!e.STORE.store.has(dayKey("2026-09-02", FEL_WEB)), "and the day lists one dog for Fel");
  assert.equal(JSON.parse(e.STORE.store.get(`owner:${FEL_WEB}`).value).plays, `discord-${FEL}`);

  assert.equal((await bot(e, "meld", { name: "fel_fox", discordId: FEL })).status, 404, "nothing left under that name");

  assert.deepEqual(await (await site(e, `/api/account?player=${FEL_WEB}`)).json(), { username: null, melded: true },
    "it rolls as Discord without being asked who it is");

  // The melded browser can still claim a username, and comes out linked.
  const claim = await site(e, "/api/account/claim", { player: FEL_WEB, username: "Fel", pin: ["🐶", "🦴", "🎾"] });
  assert.equal(claim.status, 200);
  assert.equal((await claim.json()).discord, true);
  assert.equal(e.STORE.store.get(`discordlink:${FEL}`).value, "fel");
});

test("one historic dog can be handed over by date, without binding its browser", async () => {
  const e = await world();
  const out = await (await bot(e, "meld", { name: "Randy", discordId: FEL, date: "2026-09-05" })).json();
  assert.deepEqual([out.moved, out.bound], [1, 0]);
  const steve = JSON.parse(e.STORE.store.get(rollKey(`discord-${FEL}`, "2026-09-05")).value);
  assert.deepEqual([steve.name, steve.score], ["Steve", 44]);
  assert.equal(e.STORE.store.get(dayKey("2026-09-05", `discord-${FEL}`)).metadata.discordId, FEL);
  assert.ok(!e.STORE.store.has(`owner:${RANDY_WEB}`), "Randy keeps his own browser");

  // A nameless player's dog is picked by its own name.
  await put(e, "c0c0c0c0-9999-4a4a-9b9b-000011112222", "", "2026-09-06", { name: "Steve", breed: "Coonhound", score: 44 });
  await put(e, "d0d0d0d0-9999-4a4a-9b9b-000011112222", "", "2026-09-06", { name: "Chowder" });
  assert.equal((await bot(e, "meld", { name: "", discordId: FEL, date: "2026-09-06" })).status, 400);
  const byDog = await (await bot(e, "meld", { dog: "steve", discordId: FEL, date: "2026-09-06" })).json();
  assert.equal(byDog.moved, 1);
  assert.equal(JSON.parse(e.STORE.store.get(rollKey(`discord-${FEL}`, "2026-09-06")).value).name, "Steve");

  // A day Discord already has: counted as kept, and the web dog stays on the board.
  const clash = await (await bot(e, "meld", { name: "fel_fox", discordId: FEL, date: "2026-09-02" })).json();
  assert.deepEqual([clash.moved, clash.kept], [0, 1]);
  assert.ok(e.STORE.store.has(dayKey("2026-09-02", FEL_WEB)));
});

test("one person on two browsers folds into one web player, and keeps that name", async () => {
  const e = await world();
  const MOL = "b0b0b0b0-1111-4a4a-9b9b-222233334444";
  const RAEP = "c1c1c1c1-1111-4a4a-9b9b-222233334444";
  await put(e, MOL, "Molossus", "2026-09-01");
  await put(e, RAEP, "Raepdog", "2026-09-01");
  await put(e, RAEP, "Raepdog", "2026-09-02");

  const out = await (await bot(e, "meld", { name: "Raepdog", into: "Molossus" })).json();
  assert.deepEqual([out.moved, out.kept, out.bound], [1, 1, 1]);
  assert.equal(e.STORE.store.get(dayKey("2026-09-02", MOL)).metadata.player, "Molossus", "moved dogs take the name");
  assert.equal(e.STORE.store.get(dayKey("2026-09-02", MOL)).metadata.discordId, undefined);

  // Claiming on the folded browser claims Molossus's dogs; the other browser sees it too.
  const claim = await site(e, "/api/account/claim", { player: RAEP, username: "Molossus", pin: ["🐶", "🦴", "🎾"] });
  assert.equal(claim.status, 200);
  assert.equal((await (await site(e, `/api/account?player=${MOL}`)).json()).username, "molossus");
  const login = await (await site(e, "/api/account/login", { username: "molossus", pin: ["🐶", "🦴", "🎾"] })).json();
  assert.equal(login.player, MOL);
  const again = await site(e, "/api/account/claim", { player: MOL, username: "Other", pin: ["🐶", "🦴", "🎾"] });
  assert.equal(again.status, 409);

  // Later linked to Discord: the folded browser follows along.
  const { code } = await (await site(e, "/api/account/link-code", { player: RAEP })).json();
  assert.equal((await bot(e, "link", { discordId: FEL, code })).status, 200);
  const { playsAs } = await import("../src/accounts.js");
  assert.equal(await playsAs(e, RAEP), `discord-${FEL}`);
});

test("meld needs the bot token", async () => {
  const e = await world();
  const url = new URL(`${ORIGIN}/api/bot/meld`);
  assert.equal((await handleBot(new Request(url), url, e)).status, 401);
});
