// The mega-kennel reads every dog from the board index. What matters: it pages through
// the whole index, never reads a value, keeps frogs and test rolls out of the numbers,
// and never lets a web player's id out.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { megaKennelData } from "../src/mega.js";
import { dayKey, boardRow } from "../src/keys.js";
import { rollDailyDog } from "../src/roll.js";
import { setLogSink } from "../src/log.js";

setLogSink(() => {});

const ORIGIN = "https://dogdle.swampkat.com";
const WEB = "0f5a2c3e-1111-4a4a-9b9b-222233334444";
const DISCORD = "discord-123456789012345678";

// A KV that pages its list three keys at a time, so the cursor loop is exercised.
function pagedKV() {
  const store = new Map();
  return {
    store,
    reads: 0,
    async get() { this.reads++; return null; },
    async put(key, value, opts = {}) { store.set(key, { value, metadata: opts.metadata ?? null }); },
    async list({ prefix, cursor }) {
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const keys = all.slice(start, start + 3).map((name) => ({ name, metadata: store.get(name).metadata }));
      const done = start + 3 >= all.length;
      return { keys, list_complete: done, ...(done ? {} : { cursor: String(start + 3) }) };
    },
  };
}

async function seed() {
  const kv = pagedKV();
  const put = (player, date, name, opts = {}) => {
    const dog = rollDailyDog(player, date, opts);
    return kv.put(dayKey(date, player), "", { metadata: { ...boardRow(name, dog), ...(opts.test ? { test: true } : {}) } });
  };
  await put(WEB, "2026-09-01", "Webby");
  await put(WEB, "2026-09-02", "Webby");
  await put(DISCORD, "2026-09-01", "Felfox");
  await put(DISCORD, "2026-09-02", "Felfox");
  await put(DISCORD, "2026-09-03", "Felfox", { frog: true });
  await put("discord-555555555555", "2026-09-03", "Tester", { test: true });
  await put("discord-777777777777", "2026-09-04", "");
  return kv;
}

test("the mega-kennel counts every dog from the index alone", async () => {
  const kv = await seed();
  const m = await megaKennelData({ STORE: kv }, ORIGIN);

  assert.equal(kv.reads, 0, "no values are read");
  assert.equal(m.dogs, 6, "the test roll is left out");
  assert.equal(m.frogs, 1);
  assert.equal(m.players, 3);
  assert.equal(m.first, "2026-09-01");
  assert.equal(m.last, "2026-09-04");
  assert.equal(m.all.length, 6);

  const real = m.all.filter((d) => !d.frog);
  assert.equal(m.total, real.reduce((s, d) => s + d.score, 0), "frogs don't count toward the total");
  assert.ok(m.best.score >= m.worst.score);
  assert.ok(m.all.every((d, i, a) => i === 0 || a[i - 1].date >= d.date), "newest first");
});

test("a web player's id never leaves the server", async () => {
  const m = await megaKennelData({ STORE: await seed() }, ORIGIN);
  const body = JSON.stringify(m);
  assert.ok(!body.includes(WEB), "the web id is nowhere in the response");
  assert.ok(!body.includes("discord-555555555555"), "nor is a test player");

  const web = m.all.filter((d) => d.owner === "Webby");
  assert.equal(web.length, 2);
  assert.ok(web.every((d) => !d.image && !d.kennel));

  const felfox = m.all.filter((d) => d.owner === "Felfox");
  assert.ok(felfox.every((d) => d.image === `${ORIGIN}/i/${DISCORD}/${d.date}.gif`));
  assert.equal(m.kennels.find((k) => k.name === "Felfox").kennel, `${ORIGIN}/kennel/${DISCORD}`);
  assert.equal(m.kennels.find((k) => k.name === "Webby").kennel, undefined);
});

test("/kennels unfurls with the best card and /api/kennels is public", async () => {
  const STORE = await seed();
  const ASSETS = { fetch: async () => new Response("<html><head><title>x</title></head><body></body></html>") };
  const env = { STORE, ASSETS };

  const api = await worker.fetch(new Request(`${ORIGIN}/api/kennels`), env);
  assert.equal(api.status, 200);
  assert.equal((await api.json()).dogs, 6);

  const page = await (await worker.fetch(new Request(`${ORIGIN}/kennels`), env)).text();
  assert.match(page, /<meta property="og:title" content="The Mega-Kennel/);
  assert.match(page, /6 dogs from 3 players/);
  assert.match(page, new RegExp(`og:image" content="${ORIGIN}/i/discord-`));
});

test("the page and the api share one cached listing", async () => {
  const saved = new Map();
  globalThis.caches = { default: {
    match: async (req) => saved.get(req.url)?.clone() ?? null,
    put: async (req, res) => { saved.set(req.url, res); },
  } };
  try {
    const STORE = await seed();
    let lists = 0;
    const list = STORE.list.bind(STORE);
    STORE.list = (opts) => { lists++; return list(opts); };
    const ASSETS = { fetch: async () => new Response("<title>x</title>") };
    await worker.fetch(new Request(`${ORIGIN}/api/kennels`), { STORE, ASSETS });
    const before = lists;
    await worker.fetch(new Request(`${ORIGIN}/kennels`), { STORE, ASSETS });
    assert.ok(before > 0);
    assert.equal(lists, before, "the second view lists nothing");
  } finally {
    delete globalThis.caches;
  }
});
