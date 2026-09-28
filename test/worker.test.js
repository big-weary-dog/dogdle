// The Worker's own error handling: an exception anywhere is logged and answered as a JSON
// 500 naming the ray id, and the photo proxy says which way upstream failed.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { setLogSink } from "../src/log.js";

let logged = [];
setLogSink((level, entry) => logged.push({ level, ...entry }));

const PLAYER = "0f8b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d";

test("an exception in a route is logged and answered with its ray id", async () => {
  const env = {
    STORE: {
      get: async () => {
        throw new Error("KV GET failed: 503");
      },
    },
  };
  logged = [];
  const req = new Request(`https://dogdle.swampkat.com/api/roll?player=${PLAYER}`, {
    headers: { "cf-ray": "8c1a2b3c4d5e6f70-IAD" },
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "internal error", ray: "8c1a2b3c4d5e6f70-IAD" });

  const [entry] = logged;
  assert.equal(entry.level, "error");
  assert.equal(entry.event, "request.failed");
  assert.equal(entry.path, "/api/roll");
  assert.equal(entry.err.message, "KV GET failed: 503", "the error should survive into the log");
});

test("the photo proxy answers a timeout as a 504, not a crash", async () => {
  const offline = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  };
  logged = [];
  try {
    const u = encodeURIComponent("https://images.dog.ceo/breeds/pug/x.jpg");
    const res = await worker.fetch(new Request(`https://dogdle.swampkat.com/img?u=${u}`), {});
    assert.equal(res.status, 504);
    assert.equal(logged[0].event, "img.upstream_failed");
    assert.equal(logged[0].reason, "timeout");
  } finally {
    globalThis.fetch = offline;
  }
});

test("a frog is dealt with its own photo, without ever asking Dog CEO", async () => {
  const { isFrogDay, today } = await import("../src/roll.js");
  let player = null;
  for (let i = 0; !player; i++) {
    const id = `frog-player-${String(i).padStart(4, "0")}`;
    if (isFrogDay(id, today())) player = id;
  }

  const online = globalThis.fetch;
  globalThis.fetch = async (url) => assert.fail(`a frog fetched ${url}`);
  const puts = {};
  const env = {
    STORE: {
      get: async () => null,
      put: async (key, value, opts) => { puts[key] = { value, opts }; },
    },
  };
  try {
    const res = await worker.fetch(new Request(`https://dogdle.swampkat.com/api/roll?player=${player}`), env);
    const dog = await res.json();
    assert.equal(dog.frog, true);
    assert.match(dog.photo, /^\/frogs\/[\w-]+\.jpg$/, "a frog's photo is one of ours");
    assert.equal(dog.breed, "Intruder");
    const row = puts[`day:${today()}:${player}`].opts.metadata;
    assert.match(row.dog, / Frog$/, "the frog is on the leaderboard under its own name");

    // And replaying it keeps the same photo.
    env.STORE.get = async () => dog;
    const again = await worker.fetch(new Request(`https://dogdle.swampkat.com/api/roll?player=${player}`), env);
    const replay = await again.json();
    assert.equal(replay.replayed, true);
    assert.equal(replay.photo, dog.photo);

    // A frog dealt before frog photos existed gets one on read, still without the network.
    const { photo, ...legacy } = dog;
    env.STORE.get = async () => ({ ...legacy, photo: null });
    env.STORE.getWithMetadata = async () => ({ metadata: row });
    const { rollKey } = await import("../src/keys.js");
    delete puts[rollKey(player, today())];
    const healed = await (await worker.fetch(new Request(`https://dogdle.swampkat.com/api/roll?player=${player}`), env)).json();
    assert.equal(healed.photo, photo, "the backfill picks the same frog the roll would have");
    assert.equal(JSON.parse(puts[rollKey(player, today())].value).photo, photo, "and keeps it");
  } finally {
    globalThis.fetch = online;
  }
});
