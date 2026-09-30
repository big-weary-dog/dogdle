// Melding: folding an anonymous web player into the Discord player they turned out to be,
// by hand, after the fact. Operator-only, behind the bot token, run from meld.yml.
//
// GET  /api/bot/meld[?dog=<name>]  the plan: every anonymous web player (by the names on
//                                  their board rows, never their id), the Discord players
//                                  whose names sound closest, and how many days overlap.
//                                  `dog` also finds dogs by name, wherever they are.
// POST /api/bot/meld { name | dog, discordId, date?, dryRun? }
//                                  moves every anonymous web player last seen as `name` to
//                                  that Discord player, and binds their browsers to it. With
//                                  `date`, moves that one day's dog only (picked by `name`,
//                                  or by `dog` for a nameless player) and binds nothing.
//
// A day the Discord player already has a dog for is never merged: Discord's dog stays.

import { allRows } from "./mega.js";
import { moveRolls, bindToDiscord, ownerRecord, discordLinkedTo } from "./accounts.js";
import { DATE_RE } from "./keys.js";
import { log } from "./log.js";

const isDiscord = (player) => player.startsWith("discord-");
const canonical = (s) => String(s || "").trim().toLowerCase();

// ---------- how alike two names sound ----------

const letters = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]/g, "");

function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// The consonant skeleton: "Felfox" and "fell_fox" and "Phelfocks" come out close.
function skeleton(name) {
  const s = letters(name).replace(/[0-9]/g, "").replace(/ph/g, "f").replace(/ck|q/g, "k")
    .replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k");
  return (s[0] ?? "") + s.slice(1).replace(/[aeiouyhw]/g, "").replace(/(.)\1+/g, "$1");
}

// 0..1. Exact (ignoring case and punctuation) is 1; one name inside the other, or the
// same consonants, is close; otherwise it's how few edits apart they are.
export function similarity(x, y) {
  const a = letters(x);
  const b = letters(y);
  if (!a || !b) return 0;
  if (a === b) return 1;
  let best = 1 - distance(a, b) / Math.max(a.length, b.length);
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 3 && long.includes(short)) best = Math.max(best, 0.6 + 0.3 * (short.length / long.length));
  const sa = skeleton(x);
  const sb = skeleton(y);
  if (sa.length >= 2 && sa === sb) best = Math.max(best, 0.85);
  return Math.round(best * 100) / 100;
}

const MATCH_FLOOR = 0.5;

// ---------- the players, from the board index ----------

async function owners(env) {
  const map = new Map();
  let cursor;
  do {
    const listed = await env.STORE.list({ prefix: "owner:", cursor });
    for (const k of listed.keys) map.set(k.name.slice("owner:".length), k.metadata ?? {});
    cursor = listed.list_complete === false ? listed.cursor : undefined;
  } while (cursor);
  return map;
}

async function players(env) {
  const { keys } = await allRows(env);
  const web = new Map();
  const discord = new Map();
  const dogs = [];
  for (const { name: key, metadata: row } of keys) {
    const [, date, player] = key.split(":");
    if (!row || row.test || !date || !player) continue;
    dogs.push({ date, player, row });
    const side = isDiscord(player) ? discord : web;
    const p = side.get(player) ?? { names: new Map(), dates: new Set(), dogNames: new Map(), dogs: 0, name: "", last: "", best: null };
    p.dogs++;
    p.dates.add(date);
    p.dogNames.set(date, row.dog);
    if (row.player) p.names.set(row.player, Math.max(p.names.get(row.player) ?? 0, Date.parse(date)));
    if (date >= p.last) { p.last = date; if (row.player) p.name = row.player; }
    if (!p.best || row.score > p.best.score) p.best = { name: row.dog, breed: row.breed, score: row.score, date };
    side.set(player, p);
  }
  return { web, discord, dogs };
}

export async function meldPlan(env, { dog = "" } = {}) {
  const [{ web, discord, dogs }, owned] = await Promise.all([players(env), owners(env)]);
  const discordList = [...discord].map(([player, p]) => ({ discordId: player.slice("discord-".length), ...p }));

  const sameName = new Map();
  for (const p of web.values()) sameName.set(canonical(p.name), (sameName.get(canonical(p.name)) ?? 0) + 1);

  const anonymous = [];
  let accounts = 0;
  for (const [player, p] of web) {
    if (owned.has(player)) { accounts++; continue; }
    const matches = discordList
      .map((d) => ({
        discordId: d.discordId,
        name: d.name,
        dogs: d.dogs,
        score: Math.max(...[...p.names.keys()].flatMap((a) => [...d.names.keys()].map((b) => similarity(a, b)))),
        overlap: [...p.dates].filter((date) => d.dates.has(date)).length,
      }))
      .filter((m) => m.score >= MATCH_FLOOR)
      .sort((a, b) => b.score - a.score || b.dogs - a.dogs)
      .slice(0, 3);
    anonymous.push({
      name: p.name || "(no name)",
      aka: [...p.names.keys()].filter((n) => n !== p.name),
      dogs: p.dogs,
      first: [...p.dates].sort()[0],
      last: p.last,
      best: p.best,
      ...(sameName.get(canonical(p.name)) > 1 ? { sharesName: sameName.get(canonical(p.name)) } : {}),
      matches,
    });
  }
  anonymous.sort((a, b) => (b.matches[0]?.score ?? 0) - (a.matches[0]?.score ?? 0) || b.dogs - a.dogs);

  const want = canonical(dog);
  const found = want ? dogs.filter(({ row }) => canonical(row.dog).includes(want)).map(({ date, player, row }) => ({
    date, dog: row.dog, breed: row.breed, score: row.score, owner: row.player || "",
    ...(isDiscord(player) ? { discordId: player.slice("discord-".length) } : { web: true, account: owned.get(player)?.username || null }),
  })) : undefined;

  return {
    anonymous,
    accounts,
    discord: discordList.map((d) => ({ discordId: d.discordId, name: d.name, dogs: d.dogs }))
      .sort((a, b) => b.dogs - a.dogs),
    ...(found ? { found } : {}),
  };
}

export async function meldApply(env, { name, dog, discordId, date, dryRun }) {
  if (date !== undefined && !DATE_RE.test(date)) return { status: 400, body: { error: "invalid date" } };
  if (dog !== undefined && !date) return { status: 400, body: { error: "a dog is picked by date and name" } };
  if (!canonical(name) && !canonical(dog)) return { status: 400, body: { error: "name or dog required" } };
  const [{ web, discord }, owned] = await Promise.all([players(env), owners(env)]);
  if (!discord.has(`discord-${discordId}`)) return { status: 404, body: { error: "no Discord player with that id has rolled" } };

  // Whose dogs: web players last seen under `name`; or, for one day, whoever rolled under
  // `name` that day, or rolled the dog called `dog` that day (players can be nameless).
  const want = canonical(name);
  const from = [...web].filter(([, p]) => {
    if (!date) return canonical(p.name) === want;
    if (!p.dates.has(date)) return false;
    if (dog !== undefined) return canonical(p.dogNames.get(date)) === canonical(dog);
    return [...p.names.keys()].some((n) => canonical(n) === want);
  });
  if (!from.length) return { status: 404, body: { error: `no web player ${date ? `on ${date} ` : ""}matches` } };
  if (date && from.length > 1) return { status: 409, body: { error: `${from.length} web players match that day; name the dog` } };
  const blocked = from.filter(([player]) => owned.get(player)?.username || owned.get(player)?.plays);
  if (blocked.length && !date) {
    return { status: 409, body: { error: "an account or an already-melded browser has that name; it links itself" } };
  }
  if (!date && (await discordLinkedTo(env, discordId))) {
    return { status: 409, body: { error: "that Discord player has an account; its owner should use Sync with Discord" } };
  }

  let moved = 0;
  let kept = 0;
  let skipped = 0;
  for (const [player] of from) {
    const r = await moveRolls(env, player, discordId, { only: date, dropDuplicates: !date, dryRun: Boolean(dryRun) });
    moved += r.moved;
    kept += r.kept;
    skipped += r.skipped;
    if (!date && !dryRun && !(await ownerRecord(env, player))) await bindToDiscord(env, player, discordId);
  }
  const out = { name: name ?? null, ...(dog ? { dog } : {}), discordId, players: from.length, moved, kept, skipped, bound: date ? 0 : from.length, dryRun: Boolean(dryRun) };
  if (!dryRun) log.info("meld.applied", out);
  return { status: 200, body: out };
}
