// The mega-kennel: every dog anyone has ever rolled, for GET /api/kennels and /kennels.
//
// It reads nothing but the global board index (`day:<date>:<player>`), whose rows live in
// list metadata, so the whole history is a handful of list calls and never a single value
// read. The key name carries the date and the player; the metadata carries the rest.
//
// Public, so it follows the leaderboard's rules: a web player's id is the key to their
// daily roll and never leaves the server. A Discord player's dogs link by id, as their
// embeds already do publicly; a web account's link by its username (src/accounts.js).

import { qualityFor } from "./roll.js";
import { FROG } from "./content/index.js";
import { accountOwners } from "./accounts.js";
import { log } from "./log.js";

// A thousand keys a page. Past this many pages the oldest dogs drop off, with a warning.
export const MEGA_MAX_PAGES = 20;

const isDiscord = (player) => player.startsWith("discord-");

async function allRows(env) {
  const keys = [];
  let cursor;
  let pages = 0;
  do {
    const listed = await env.STORE.list({ prefix: "day:", cursor });
    keys.push(...listed.keys);
    cursor = listed.list_complete === false ? listed.cursor : undefined;
  } while (cursor && ++pages < MEGA_MAX_PAGES);
  return { keys, truncated: Boolean(cursor) };
}

const brief = (d) => d && { name: d.name, breed: d.breed, score: d.score, date: d.date, owner: d.owner,
  qualityEmoji: d.qualityEmoji, qualityColor: d.qualityColor, ...(d.image ? { image: d.image } : {}) };

export async function megaKennelData(env, origin) {
  const [{ keys, truncated }, owners] = await Promise.all([allRows(env), accountOwners(env)]);
  // A web player with an account is shown under their public username instead.
  const links = (player, date) => {
    if (isDiscord(player)) return { image: `${origin}/i/${player}/${date}.gif`, kennel: `${origin}/kennel/${player}` };
    const username = owners.get(player);
    return username ? { image: `${origin}/u/${username}/${date}.gif`, kennel: `${origin}/kennel/${username}` } : {};
  };

  // Player ids stay in here, as a grouping key. Only Discord ones are ever sent.
  const players = new Map();
  const dogs = [];
  for (const { name: key, metadata: row } of keys) {
    const [, date, player] = key.split(":");
    if (!row || row.test || !date || !player) continue;
    const frog = row.breed === FROG.breed;
    const q = qualityFor(row.score);
    const dog = {
      date,
      name: row.dog,
      breed: row.breed,
      score: row.score,
      quality: row.quality ?? q.label,
      qualityEmoji: row.qualityEmoji ?? q.emoji,
      qualityColor: frog ? FROG.color : q.color,
      place: row.emoji,
      owner: row.player || "",
      ...(frog ? { frog: true } : {}),
      ...links(player, date),
    };
    dogs.push(dog);

    const p = players.get(player) ?? { name: "", dogs: 0, frogs: 0, total: 0, best: null, last: "" };
    p.dogs++;
    // The most recent name a player went by is the one they're listed under.
    if (date >= p.last) { p.last = date; if (dog.owner) p.name = dog.owner; }
    if (frog) p.frogs++;
    else {
      p.total += dog.score;
      if (!p.best || dog.score > p.best.score) p.best = dog;
    }
    if (dog.kennel) p.kennel = dog.kennel;
    players.set(player, p);
  }
  if (truncated) log.warn("mega.truncated", { rows: keys.length });

  // Frogs don't count toward how good dogs are, here or anywhere.
  const real = dogs.filter((d) => !d.frog);
  const total = real.reduce((s, d) => s + d.score, 0);
  const average = real.length ? Math.round((10 * total) / real.length) / 10 : 0;
  const byScore = [...real].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const dates = dogs.map((d) => d.date).sort();

  const breedCounts = new Map();
  for (const d of real) breedCounts.set(d.breed, (breedCounts.get(d.breed) ?? 0) + 1);
  const [commonBreed, commonCount] = [...breedCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [];

  // The best-scoring dog that has a card, for the link preview.
  const cover = byScore.find((d) => d.image)?.image ?? null;

  return {
    dogs: dogs.length,
    frogs: dogs.length - real.length,
    players: players.size,
    days: new Set(dates).size,
    first: dates[0] ?? null,
    last: dates.at(-1) ?? null,
    total,
    average,
    averageQuality: real.length ? qualityFor(average) : null,
    best: brief(byScore[0]),
    worst: byScore.length > 1 ? brief(byScore.at(-1)) : null,
    commonBreed: commonBreed ? { breed: commonBreed, count: commonCount } : null,
    cover,
    truncated,
    kennels: [...players.values()]
      .map((p) => {
        const counted = p.dogs - p.frogs;
        return {
          name: p.name,
          dogs: p.dogs,
          frogs: p.frogs,
          total: p.total,
          average: counted ? Math.round((10 * p.total) / counted) / 10 : 0,
          best: brief(p.best),
          ...(p.kennel ? { kennel: p.kennel } : {}),
        };
      })
      .sort((a, b) => b.dogs - a.dogs || b.total - a.total),
    all: dogs.sort((a, b) => b.date.localeCompare(a.date) || b.score - a.score),
  };
}

// Every view lists the whole index, and KV list calls are the scarce kind, so the answer
// is shared through the edge cache for a minute. The page and the API read the same entry.
const CACHE_SECONDS = 60;

export async function megaKennel(env, origin) {
  const cache = globalThis.caches?.default;
  const key = new Request(`${origin}/api/kennels`);
  const hit = await cache?.match(key);
  if (hit) return hit.json();
  const data = await megaKennelData(env, origin);
  await cache?.put(key, Response.json(data, { headers: { "cache-control": `public, max-age=${CACHE_SECONDS}` } }));
  return data;
}
