// The bot API against an in-memory KV. The things worth pinning down are that a second
// call never deals a second dog, that the guild index gets written, and that the endpoints
// are shut without the token.

import { test } from "node:test";
import assert from "node:assert/strict";

import { handleBot, botPlayerId } from "../src/bot.js";
import { PLAYER_ID_RE } from "../src/keys.js";
import { today } from "../src/roll.js";
import { BREEDS } from "../src/breeds.js";

const TOKEN = "test-token-please-ignore";
const USER = "123456789012345678";
const GUILD = "987654321098765432";

// The sandbox has no network and no Cloudflare cache; both paths are meant to degrade to
// "no photo" rather than fail, which is exactly what this exercises.
globalThis.caches ??= { default: { match: async () => null, put: async () => {} } };
globalThis.fetch = async () => {
  throw new Error("offline");
};

function makeKV() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const entry = store.get(key);
      if (!entry) return null;
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    async put(key, value, opts = {}) {
      store.set(key, { value, metadata: opts.metadata ?? null, ttl: opts.expirationTtl ?? 0 });
    },
    async getWithMetadata(key) {
      const entry = store.get(key);
      return { value: entry ? entry.value : null, metadata: entry ? entry.metadata : null };
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix, limit = 1000 }) {
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name, metadata: store.get(name).metadata }));
      return { keys };
    },
  };
}

function call(env, path, { method = "GET", body, token = TOKEN } = {}) {
  const url = new URL(`https://dogdle.swampkat.com${path}`);
  const request = new Request(url, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleBot(request, url, env);
}

const env = () => ({ STORE: makeKV(), BOT_TOKEN: TOKEN });

test("a discord player id is a valid player id everywhere else", () => {
  assert.match(botPlayerId(USER), PLAYER_ID_RE);
});

test("the bot api is shut without the token", async () => {
  const e = env();
  assert.equal((await call(e, "/api/bot/leaderboard", { token: null })).status, 401);
  assert.equal((await call(e, "/api/bot/leaderboard", { token: "wrong" })).status, 401);
  assert.equal(e.STORE.store.size, 0);
});

test("a missing secret closes the api rather than opening it", async () => {
  const res = await call({ STORE: makeKV() }, "/api/bot/leaderboard", { token: null });
  assert.equal(res.status, 503);
});

test("rolling twice deals one dog and replays it", async () => {
  const e = env();
  const first = await (await call(e, "/api/bot/roll", {
    method: "POST",
    body: { discordId: USER, guildId: GUILD, displayName: "Felfox" },
  })).json();

  assert.equal(first.replayed, false);
  assert.ok(first.image.endsWith(`/i/${botPlayerId(USER)}/${today()}.gif`));
  assert.ok(first.traits.length >= 3);
  assert.equal(typeof first.score, "number");

  const second = await (await call(e, "/api/bot/roll", {
    method: "POST",
    body: { discordId: USER, guildId: GUILD },
  })).json();

  assert.equal(second.replayed, true);
  assert.equal(second.name, first.name);
  assert.equal(second.score, first.score);
  assert.deepEqual(second.traits, first.traits);
});

test("board rows carry what a digest needs, and the public board doesn't", async () => {
  const e = env();
  await call(e, "/api/bot/roll", {
    method: "POST",
    body: { discordId: USER, guildId: GUILD, displayName: "Felfox" },
  });

  // A row written before tiers had an emoji, as today's live rows were.
  e.STORE.store.set(`guild:${GUILD}:${today()}:discord-333333333333333333`, {
    value: "",
    metadata: { player: "old", dog: "Rex", breed: "Pug", score: -12, quality: "Rough" },
  });

  const { rows } = await (await call(e, `/api/bot/leaderboard?guildId=${GUILD}`)).json();
  assert.equal(rows[0].discordId, USER);
  assert.ok(rows[0].image.endsWith(`/i/${botPlayerId(USER)}/${today()}.gif`));
  assert.equal(rows.at(-1).qualityEmoji, "😬", "old rows get a tier emoji too");

  // The website's own board is unauthenticated, so it must not hand out Discord ids.
  const { default: worker } = await import("../src/worker.js");
  const req = new Request("https://dogdle.swampkat.com/api/leaderboard");
  const web = await (await worker.fetch(req, e)).json();
  assert.equal(web.rows.length, 1);
  assert.equal(web.rows[0].discordId, undefined);
  assert.equal(web.rows[0].player, "Felfox");
});

test("a roll lands on both the global board and its guild's", async () => {
  const e = env();
  await call(e, "/api/bot/roll", {
    method: "POST",
    body: { discordId: USER, guildId: GUILD, displayName: "Felfox" },
  });

  const global = await (await call(e, "/api/bot/leaderboard")).json();
  const guild = await (await call(e, `/api/bot/leaderboard?guildId=${GUILD}`)).json();
  const other = await (await call(e, "/api/bot/leaderboard?guildId=111111111111111111")).json();

  assert.equal(global.rows.length, 1);
  assert.equal(global.rows[0].player, "Felfox");
  assert.deepEqual(guild.rows, global.rows);
  assert.deepEqual(other.rows, []);
});

test("the stored card is a GIF served by the image route", async () => {
  const e = env();
  await call(e, "/api/bot/roll", { method: "POST", body: { discordId: USER } });

  const card = e.STORE.store.get(`card:${botPlayerId(USER)}:${today()}`);
  assert.ok(card, "no card stored");
  assert.deepEqual([...card.value.slice(0, 4)], [0x47, 0x49, 0x46, 0x38]); // "GIF8"
});

test("peeking never deals a dog", async () => {
  const e = env();
  const before = await (await call(e, `/api/bot/dog?discordId=${USER}`)).json();
  assert.equal(before.pending, true);
  assert.equal(e.STORE.store.size, 0);

  await call(e, "/api/bot/roll", { method: "POST", body: { discordId: USER } });
  const after = await (await call(e, `/api/bot/dog?discordId=${USER}`)).json();
  assert.equal(after.replayed, true);
  assert.equal(typeof after.name, "string");
});

test("history lists a player's dogs newest first", async () => {
  const e = env();
  await call(e, "/api/bot/roll", { method: "POST", body: { discordId: USER } });
  e.STORE.store.set(`roll:${botPlayerId(USER)}:2026-01-01`, {
    value: "{}",
    metadata: { date: "2026-01-01", score: 3, breed: "Pug", name: "Old" },
  });

  const { rows } = await (await call(e, `/api/bot/history?discordId=${USER}`)).json();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, today());
  assert.equal(rows[1].name, "Old");
});

test("a test roll stays off the boards and expires on its own", async () => {
  const e = env();
  await call(e, "/api/bot/roll", {
    method: "POST",
    body: { discordId: USER, guildId: GUILD, displayName: "mock-alpha", test: true },
  });
  await call(e, "/api/bot/roll", {
    method: "POST",
    body: { discordId: "222222222222222222", guildId: GUILD, displayName: "real" },
  });

  const board = await (await call(e, `/api/bot/leaderboard?guildId=${GUILD}`)).json();
  assert.deepEqual(board.rows.map((r) => r.player), ["real"]);

  const all = await (await call(e, `/api/bot/leaderboard?guildId=${GUILD}&includeTest=1`)).json();
  assert.equal(all.rows.length, 2);
  assert.equal(all.rows.find((r) => r.player === "mock-alpha").test, true);

  // Nothing a test roll writes should outlive it.
  for (const [key, entry] of e.STORE.store) {
    if (!key.includes(botPlayerId(USER))) continue;
    assert.ok(entry.ttl > 0 && entry.ttl <= 60 * 60 * 48, `${key} has no short TTL`);
  }
});

test("a roll whose photo never resolved repairs itself, and drops its stale card", async () => {
  const e = env();
  await call(e, "/api/bot/roll", { method: "POST", body: { discordId: USER } });

  // Stand in for the real failure: Dog CEO was unreachable (or the slug was wrong) when
  // this dog was dealt, so the roll was stored with no photo and its card drawn without one.
  const key = `roll:${botPlayerId(USER)}:${today()}`;
  const stored = JSON.parse(e.STORE.store.get(key).value);
  stored.photo = null;
  // And the slug it was dealt under is the dead one, as megapwn's German Shepherd was:
  // retrying that would 404 forever, so the repair has to look the breed up again.
  stored.breedSlug = "a-slug-that-no-longer-exists";
  e.STORE.store.get(key).value = JSON.stringify(stored);
  const staleCard = e.STORE.store.get(`card:${botPlayerId(USER)}:${today()}`).value;
  assert.ok(staleCard, "no card to invalidate");

  const photoUrl = "https://images.dog.ceo/breeds/pug/repaired.jpg";
  const offline = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: "success", message: photoUrl }), {
      headers: { "content-type": "application/json" },
    });
  try {
    const again = await (await call(e, "/api/bot/roll", {
      method: "POST",
      body: { discordId: USER },
    })).json();
    assert.equal(again.replayed, true, "repairing must not re-deal the dog");
    assert.equal(again.name, stored.name);
  } finally {
    globalThis.fetch = offline;
  }

  const after = JSON.parse(e.STORE.store.get(key).value);
  assert.equal(after.photo, photoUrl, "photo was not written back");
  assert.notEqual(after.breedSlug, "a-slug-that-no-longer-exists", "the dead slug was kept");
  assert.equal(
    after.breedSlug,
    BREEDS.find((b) => b.name === after.breed).slug,
    "the slug should be re-resolved from the breed table"
  );
  assert.equal(after.name, stored.name, "the dog itself must be untouched");
  assert.notEqual(
    e.STORE.store.get(`card:${botPlayerId(USER)}:${today()}`).value,
    staleCard,
    "the card drawn without a photo should have been re-rendered"
  );
});

test("junk ids are rejected before anything is written", async () => {
  const e = env();
  const bad = [
    ["/api/bot/roll", { method: "POST", body: { discordId: "not-a-snowflake" } }],
    ["/api/bot/roll", { method: "POST", body: { discordId: USER, guildId: "nope" } }],
    ["/api/bot/dog?discordId=x", {}],
    ["/api/bot/leaderboard?date=yesterday", {}],
    ["/api/bot/history?discordId=", {}],
  ];

  for (const [path, opts] of bad) {
    const res = await call(e, path, opts);
    assert.equal(res.status, 400, path);
  }
  assert.equal(e.STORE.store.size, 0);
});
