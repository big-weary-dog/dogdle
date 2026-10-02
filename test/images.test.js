// Rendered images live in R2 when it's bound (src/images.js). What matters: a card the bot
// just drew loads from a location whose KV hasn't seen anything yet -- the invisible dog
// -- cards and albums written before the move still load from KV, and a write R2 refuses
// still lands somewhere.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { handleBot, botPlayerId } from "../src/bot.js";
import { putCard, getCard, hasCard, putAlbum, getAlbum } from "../src/images.js";
import { cardKey, kennelKey } from "../src/keys.js";
import { today } from "../src/roll.js";
import { setLogSink } from "../src/log.js";

setLogSink(() => {});
globalThis.caches ??= { default: { match: async () => null, put: async () => {} } };
globalThis.fetch = async () => { throw new Error("offline"); };

const ORIGIN = "https://dogdle.swampkat.com";
const TOKEN = "test-token-please-ignore";
const USER = "185432109876543210";
const GIF = new TextEncoder().encode("GIF89a-not-really");

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
    async put(key, value, opts = {}) { store.set(key, { value, metadata: opts.metadata ?? null, opts }); },
    async getWithMetadata(key) {
      const entry = store.get(key);
      return { value: entry?.value ?? null, metadata: entry?.metadata ?? null };
    },
    async delete(key) { store.delete(key); },
    async list({ prefix }) {
      return { keys: [...store.keys()].filter((k) => k.startsWith(prefix)).sort()
        .map((name) => ({ name, metadata: store.get(name).metadata })), list_complete: true };
    },
  };
}

// Just enough of an R2 bucket. `broken` makes every write fail.
function makeR2({ broken = false } = {}) {
  const objects = new Map();
  const object = (key) => objects.has(key) ? { key, ...objects.get(key) } : null;
  return {
    objects,
    async put(key, value, opts = {}) {
      if (broken) throw new Error("r2 is having a day");
      objects.set(key, { bytes: new Uint8Array(await new Response(value).arrayBuffer()), ...opts });
    },
    async get(key) {
      const o = object(key);
      return o && { ...o, arrayBuffer: async () => o.bytes.slice().buffer };
    },
    async head(key) { return object(key); },
  };
}

const bot = (e, path, body) => {
  const url = new URL(`${ORIGIN}${path}`);
  return handleBot(new Request(url, {
    method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(body),
  }), url, e);
};
const site = (e, path) => worker.fetch(new Request(`${ORIGIN}${path}`), e);

test("a card the bot just drew loads from a location whose KV hasn't caught up", async () => {
  const IMAGES = makeR2();
  const here = { STORE: makeKV(), IMAGES, BOT_TOKEN: TOKEN };
  const out = await (await bot(here, "/api/bot/roll", { discordId: USER, displayName: "Felfox" })).json();

  const player = botPlayerId(USER);
  assert.ok(IMAGES.objects.has(`cards/${player}/${today()}`), "the card went to R2");
  assert.equal(IMAGES.objects.get(`cards/${player}/${today()}`).httpMetadata.contentType, "image/gif");
  assert.ok(!here.STORE.store.has(cardKey(player, today())), "and not to KV");

  // Discord's image proxy, somewhere KV has neither the card nor the roll yet.
  const there = { STORE: makeKV(), IMAGES, BOT_TOKEN: TOKEN };
  const res = await site(there, new URL(out.image).pathname);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/gif");

  // Asking again replays the dog and finds the card where it left it, rather than redrawing.
  const before = IMAGES.objects.get(`cards/${player}/${today()}`);
  await bot(here, "/api/bot/roll", { discordId: USER });
  assert.equal(IMAGES.objects.get(`cards/${player}/${today()}`), before);
});

test("a test roll's card goes where the lifecycle rule clears it quickly", async () => {
  const IMAGES = makeR2();
  const e = { STORE: makeKV(), IMAGES, BOT_TOKEN: TOKEN };
  await bot(e, "/api/bot/roll", { discordId: "285432109876543210", test: true });
  const keys = [...IMAGES.objects.keys()];
  assert.deepEqual(keys, [`test/cards/${botPlayerId("285432109876543210")}/${today()}`]);
  assert.ok(await hasCard(e, botPlayerId("285432109876543210"), today()), "and reads find it there");
});

test("images stored in KV before the move still load", async () => {
  const e = { STORE: makeKV(), IMAGES: makeR2() };
  await e.STORE.put(cardKey("discord-1", "2026-09-01"), GIF);
  await e.STORE.put(kennelKey("discord-1", "2026-09-01-3"), GIF);
  assert.deepEqual(new Uint8Array(await getCard(e, "discord-1", "2026-09-01")), GIF);
  assert.ok(await hasCard(e, "discord-1", "2026-09-01"));
  assert.deepEqual(new Uint8Array(await getAlbum(e, "discord-1", "2026-09-01-3")), GIF);
  assert.equal(await getCard(e, "discord-1", "2026-09-02"), null);
  assert.equal(await hasCard(e, "discord-1", "2026-09-02"), false);
});

test("a write R2 refuses lands in KV, and without R2 everything is KV", async () => {
  const broken = { STORE: makeKV(), IMAGES: makeR2({ broken: true }) };
  await putCard(broken, "discord-1", "2026-09-01", GIF);
  await putAlbum(broken, "discord-1", "2026-09-01-3", GIF);
  assert.ok(broken.STORE.store.has(cardKey("discord-1", "2026-09-01")));
  assert.ok(broken.STORE.store.has(kennelKey("discord-1", "2026-09-01-3")));
  assert.deepEqual(new Uint8Array(await getCard(broken, "discord-1", "2026-09-01")), GIF);

  const kvOnly = { STORE: makeKV() };
  await putCard(kvOnly, "discord-1", "2026-09-01", GIF, { test: true });
  assert.equal(kvOnly.STORE.store.get(cardKey("discord-1", "2026-09-01")).opts.expirationTtl, 60 * 60 * 48);
  await putAlbum(kvOnly, "discord-1", "2026-09-01-3", GIF);
  assert.equal(kvOnly.STORE.store.get(kennelKey("discord-1", "2026-09-01-3")).opts.expirationTtl, 60 * 60 * 24 * 7);
});

test("an album goes to R2 and loads from anywhere", async () => {
  const IMAGES = makeR2();
  await putAlbum({ STORE: makeKV(), IMAGES }, "discord-1", "2026-09-01-3", GIF);
  assert.ok(IMAGES.objects.has("albums/discord-1/2026-09-01-3"));
  assert.deepEqual(new Uint8Array(await getAlbum({ STORE: makeKV(), IMAGES }, "discord-1", "2026-09-01-3")), GIF);
});
