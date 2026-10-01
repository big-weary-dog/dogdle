// Puppy days: about one pull in ten, a puppy of your last dog and someone else's dog off
// yesterday's board. What matters: it's rare and never on a frog day, the puppy really is
// both parents' (and still obeys the trait rules), it doesn't tilt the average dog, the
// parents come only from where they should, both kennels hear about it, and a web player's
// private id never rides along into anything public.

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/worker.js";
import { handleBot, botPlayerId } from "../src/bot.js";
import { rollDailyDog, rollPuppy, isPuppyDay, isFrogDay, today, PUPPY_CHANCE } from "../src/roll.js";
import { dealDog, yesterday, litterKey } from "../src/litter.js";
import { rollKey, dayKey, boardRow } from "../src/keys.js";
import { MODIFIERS, MODIFIER_COUNT_MIN, MODIFIER_COUNT_MAX } from "../src/content/index.js";
import { setLogSink } from "../src/log.js";

setLogSink(() => {});
globalThis.caches ??= { default: { match: async () => null, put: async () => {} } };
globalThis.fetch = async () => { throw new Error("offline"); };

const ORIGIN = "https://dogdle.swampkat.com";
const TOKEN = "test-token-please-ignore";

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

const env = () => ({ STORE: makeKV(), BOT_TOKEN: TOKEN, ASSETS: { fetch: async () => new Response("<html></html>") } });
const site = (e, path) => worker.fetch(new Request(`${ORIGIN}${path}`), e);
const bot = (e, path, body) => {
  const url = new URL(`${ORIGIN}${path}`);
  return handleBot(new Request(url, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  }), url, e);
};

const TRAIT = new Map(MODIFIERS.map((m) => [m.text, m]));
const DATE = "2026-09-15";

// The first id of a pattern whose day today is (or isn't) a puppy day.
const find = (make, pred) => {
  for (let i = 0; ; i++) if (pred(make(i))) return make(i);
};
const puppyWeb = (date) => find((i) => `puppy-web-${String(i).padStart(5, "0")}`, (id) => isPuppyDay(id, date));
const puppySnowflake = (date) =>
  find((i) => String(300000000000000000n + BigInt(i)), (s) => isPuppyDay(botPlayerId(s), date));

// A stored roll and its board row, the way the routes write them.
function seed(e, player, date, name, dog = rollDailyDog(player, date, { frog: false }), extra = {}) {
  const stored = { ...dog, player: name, ...extra };
  e.STORE.store.set(rollKey(player, date), { value: JSON.stringify(stored),
    metadata: { date, score: dog.score, breed: dog.breed, name: dog.name, ...extra } });
  e.STORE.store.set(dayKey(date, player), { value: "", metadata: { ...boardRow(name, stored) } });
  return stored;
}

// Two plain parents, as dealDog would hand them over.
const parentsOf = (a, b) => [a, b].map((id, i) => ({
  dog: rollDailyDog(id, DATE, { frog: false }), owner: `owner-${i}`, kennel: i ? `/kennel/${id}` : null,
}));

test("about one pull in ten is a puppy, and never on a frog day", () => {
  let puppies = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const id = `rate-${i}`;
    if (isPuppyDay(id, DATE)) {
      puppies++;
      assert.ok(!isFrogDay(id, DATE), `${id} is a frog and a puppy`);
    }
  }
  const rate = puppies / n;
  assert.ok(Math.abs(rate - PUPPY_CHANCE) < 0.008, `puppy rate ${rate.toFixed(4)}, expected ~${PUPPY_CHANCE}`);
});

test("a puppy is both parents', a fresh dog besides, and deterministic", () => {
  let mutts = 0;
  for (let i = 0; i < 400; i++) {
    const parents = parentsOf(`ma-${i}`, `pa-${i}`);
    const pup = rollPuppy(`kid-${i}`, DATE, parents);
    assert.deepEqual(rollPuppy(`kid-${i}`, DATE, parents), pup, "same pull, same puppy");

    const breeds = parents.map((p) => p.dog.breed);
    assert.ok(breeds.includes(pup.breed) || pup.breedSlug === "mix", `${pup.breed} isn't either parent's`);
    if (pup.breedSlug === "mix" && !breeds.includes(pup.breed)) mutts++;

    assert.ok(pup.modifiers.length >= MODIFIER_COUNT_MIN && pup.modifiers.length <= MODIFIER_COUNT_MAX);
    const texts = pup.modifiers.map((m) => m.text);
    assert.equal(new Set(texts).size, texts.length, "no trait twice");
    const groups = pup.modifiers.map((m) => TRAIT.get(m.text).group).filter(Boolean);
    assert.equal(new Set(groups).size, groups.length, `a group twice: ${groups}`);
    assert.ok(pup.modifiers.every((m) => !TRAIT.get(m.text).obsolete), "only traits that can still spawn");

    // Each inherited trait really is that parent's; at least one trait is new.
    for (const m of pup.modifiers.filter((m) => m.from !== undefined)) {
      assert.ok(parents[m.from].dog.modifiers.some((x) => x.text === m.text), `${m.text} isn't parent ${m.from}'s`);
    }
    assert.ok(pup.modifiers.some((m) => m.from === undefined), "at least one fresh trait");
    for (const side of [0, 1]) {
      assert.ok(pup.modifiers.some((m) => m.from === side), `nothing inherited from parent ${side}`);
    }

    assert.deepEqual(pup.puppy.parents.map((p) => p.name), parents.map((p) => p.dog.name));
    assert.deepEqual(pup.puppy.parents.map((p) => p.kennel), [null, "/kennel/pa-" + i]);
    assert.equal(pup.score, pup.breedValue + pup.background.value + pup.modifiers.reduce((s, m) => s + m.value, 0));
  }
  assert.ok(mutts > 20, `only ${mutts} mutts in 400 litters`);
});

test("puppies don't tilt the average dog", () => {
  const scores = [];
  for (let i = 0; i < 4000; i++) scores.push(rollPuppy(`avg-${i}`, DATE, parentsOf(`avg-ma-${i}`, `avg-pa-${i}`)).score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  assert.ok(Math.abs(mean) < 0.5, `the average puppy scores ${mean.toFixed(3)}, expected ~0`);
});

test("parents come from your last dog and someone else's dog yesterday, never a frog or a test", async () => {
  const date = today();
  const day = yesterday(date);
  const me = puppyWeb(date);
  const e = env();

  // My last dog, and an older one that isn't it.
  const old = new Date(`${date}T12:00:00Z`);
  old.setUTCDate(old.getUTCDate() - 5);
  seed(e, me, old.toISOString().slice(0, 10), "Me");
  const three = new Date(`${date}T12:00:00Z`);
  three.setUTCDate(three.getUTCDate() - 3);
  const mine = seed(e, me, three.toISOString().slice(0, 10), "Me");

  // Yesterday: a frog, a test roll, and one dog that can be a parent.
  seed(e, "discord-111111111111111111", day, "Froggy", rollDailyDog("frogger-0001", day, { frog: true }));
  seed(e, "discord-222222222222222222", day, "Tester", undefined, { test: true });
  const theirs = seed(e, "discord-333333333333333333", day, "Sam");

  const res = await site(e, `/api/roll?player=${me}&name=Me`);
  const pup = await res.json();
  assert.ok(pup.puppy, "a puppy day with parents makes a puppy");
  assert.deepEqual(pup.puppy.parents.map((p) => [p.name, p.owner]), [[mine.name, "Me"], [theirs.name, "Sam"]]);
  // I'm anonymous, so my side links nowhere; Sam's kennel is public.
  assert.deepEqual(pup.puppy.parents.map((p) => p.kennel), [null, "/kennel/discord-333333333333333333"]);
  assert.ok(!JSON.stringify(pup.puppy).includes(me), "my private id isn't in the puppy");

  // The board flags it, and both parents' kennels list it.
  assert.equal(e.STORE.store.get(dayKey(date, me)).metadata.puppy, true);
  for (const parent of [me, "discord-333333333333333333"]) {
    const row = e.STORE.store.get(litterKey(parent, date, me))?.metadata;
    assert.ok(row, `no litter record for ${parent}`);
    assert.equal(row.dog, pup.name);
    assert.equal(row.kennel, null, "the puppy's owner is anonymous, so no link");
  }

  // Sam's public kennel shows the puppy, and nothing on it names me by id.
  const kennel = await (await site(e, "/api/kennel?player=discord-333333333333333333")).json();
  assert.equal(kennel.puppies.length, 1);
  assert.deepEqual([kennel.puppies[0].dog, kennel.puppies[0].parent, kennel.puppies[0].owner], [pup.name, theirs.name, "Me"]);
  assert.ok(!JSON.stringify(kennel).includes(me), "a web player's id leaked into a public kennel");

  // Replayed, not re-dealt.
  const again = await (await site(e, `/api/roll?player=${me}&name=Me`)).json();
  assert.equal(again.name, pup.name);
  assert.deepEqual(again.puppy, pup.puppy);
});

test("with no dog of your own, or nobody else yesterday, a puppy day is a plain dog", async () => {
  const date = today();
  const me = puppyWeb(date);

  const empty = env();
  seed(empty, "discord-333333333333333333", yesterday(date), "Sam");
  assert.deepEqual(await dealDog(empty, me, date), { dog: rollDailyDog(me, date) });

  const alone = env();
  seed(alone, me, yesterday(date), "Me");
  seed(alone, "discord-111111111111111111", yesterday(date), "Froggy", rollDailyDog("frogger-0001", DATE, { frog: true }));
  assert.deepEqual(await dealDog(alone, me, date), { dog: rollDailyDog(me, date) }, "only me and a frog yesterday");

  // An ordinary day never even looks.
  const plain = find((i) => `plain-web-${String(i).padStart(5, "0")}`, (id) => !isPuppyDay(id, date));
  seed(alone, plain, "2026-01-01", "Plain");
  assert.deepEqual(await dealDog(alone, plain, date), { dog: rollDailyDog(plain, date) });
});

test("the bot says whose puppy it is, with links, and which traits came from whom", async () => {
  const date = today();
  const snowflake = puppySnowflake(date);
  const me = botPlayerId(snowflake);
  const e = env();
  seed(e, me, yesterday(date), "Felfox");
  seed(e, "discord-333333333333333333", yesterday(date), "Sam");

  const out = await (await bot(e, "/api/bot/roll", { discordId: snowflake, guildId: "999999999999", displayName: "Felfox" })).json();
  assert.ok(out.puppy, "the bot shows the puppy");
  assert.deepEqual(out.puppy.parents.map((p) => p.owner), ["Felfox", "Sam"]);
  assert.deepEqual(out.puppy.parents.map((p) => p.kennel),
    [`${ORIGIN}/kennel/${me}`, `${ORIGIN}/kennel/discord-333333333333333333`]);
  const names = out.puppy.parents.map((p) => p.name);
  const inherited = out.traits.filter((t) => t.from);
  assert.ok(inherited.length >= 2 && inherited.every((t) => names.includes(t.from)));
  assert.ok(e.STORE.store.has(litterKey("discord-333333333333333333", date, me)));
});

test("a puppy's card draws", async () => {
  const pup = rollPuppy("card-kid", DATE, parentsOf("card-ma", "card-pa"));
  const { composeCard } = await import("../src/card.js");
  assert.ok(composeCard(pup), "a puppy card draws");
});

test("a puppy gets a photo of its breed, like any dog", async () => {
  const date = today();
  const me = puppyWeb(date);
  const e = env();
  seed(e, me, yesterday(date), "Me");
  seed(e, "discord-333333333333333333", yesterday(date), "Sam");

  const asked = [];
  const offline = globalThis.fetch;
  globalThis.fetch = async (url) => {
    asked.push(String(url));
    return Response.json({ status: "success", message: "https://images.dog.ceo/breeds/test/pup.jpg" });
  };
  try {
    const pup = await (await site(e, `/api/roll?player=${me}&name=Me`)).json();
    assert.ok(pup.puppy, "it's a puppy");
    assert.equal(pup.photo, "https://images.dog.ceo/breeds/test/pup.jpg");
    assert.ok(asked.some((u) => u.includes(pup.breedSlug)), `asked for ${asked}, not ${pup.breedSlug}`);
    assert.equal(JSON.parse(e.STORE.store.get(rollKey(me, date)).value).photo, pup.photo, "stored with the roll");
  } finally {
    globalThis.fetch = offline;
  }
});
