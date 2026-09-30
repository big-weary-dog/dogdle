// Puppy days: about one pull in twenty, today's dog is a puppy of the player's last dog and
// a dog off yesterday's board that belongs to someone else. src/roll.js deals the puppy
// itself (rollPuppy); this picks its parents and keeps the record of who had puppies.
//
//   litter:<parent player>:<date>:<puppy player>   one per parent, empty value, the row
//                                                  in metadata -- a kennel's Puppies shelf
//
// The pick is by the day's seed, over yesterday's board as it stands when the lever is
// pulled: yesterday is over, so it's the same pick however often it's asked. Frogs and
// test rolls are never parents. With no dog of your own yet, or nobody else on yesterday's
// board, the day is a plain dog.

import { rollDailyDog, rollPuppy, isPuppyDay, hashString } from "./roll.js";
import { FROG } from "./content/index.js";
import { rollKey } from "./keys.js";
import { ownerRecord, discordLinkedTo } from "./accounts.js";
import { log } from "./log.js";

export const litterKey = (parent, date, puppy) => `litter:${parent}:${date}:${puppy}`;

export function yesterday(date) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const isParentRow = (row) => row && !row.test && row.breed !== FROG.breed;

// Where a player's kennel is, for anyone to see: by username when they have one, by
// Discord id for a Discord player without, and nowhere for an anonymous browser.
export async function publicKennel(env, player) {
  if (player.startsWith("discord-")) {
    const username = await discordLinkedTo(env, player.slice("discord-".length));
    return username ? `/kennel/${username}` : `/kennel/${player}`;
  }
  const owner = await ownerRecord(env, player);
  return owner?.username ? `/kennel/${owner.username}` : null;
}

async function listAll(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const listed = await env.STORE.list({ prefix, cursor });
    keys.push(...listed.keys);
    cursor = listed.list_complete === false ? listed.cursor : undefined;
  } while (cursor);
  return keys;
}

// The two parents, or null for a plain day.
async function parentsFor(env, player, date) {
  const mine = (await listAll(env, `roll:${player}:`))
    .filter((k) => k.metadata?.date < date && isParentRow(k.metadata))
    .sort((a, b) => a.metadata.date.localeCompare(b.metadata.date))
    .at(-1);
  if (!mine) return null;

  const day = yesterday(date);
  const theirs = (await listAll(env, `day:${day}:`))
    .filter((k) => isParentRow(k.metadata) && k.name.slice(`day:${day}:`.length) !== player)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!theirs.length) return null;
  const other = theirs[hashString(`mate:${player}:${date}`) % theirs.length];
  const otherPlayer = other.name.slice(`day:${day}:`.length);

  const [myDog, theirDog] = await Promise.all([
    env.STORE.get(mine.name, "json"),
    env.STORE.get(rollKey(otherPlayer, day), "json"),
  ]);
  if (!myDog || !theirDog || myDog.frog || theirDog.frog) return null;
  const [myKennel, theirKennel] = await Promise.all([publicKennel(env, player), publicKennel(env, otherPlayer)]);
  return [
    { player, dog: myDog, owner: myDog.player || "", kennel: myKennel },
    { player: otherPlayer, dog: theirDog, owner: other.metadata.player || theirDog.player || "", kennel: theirKennel },
  ];
}

// Today's dog for a player who hasn't rolled yet: a plain dog, or on a puppy day a puppy.
// Returns the parents too, so the caller can record the litter once the puppy is stored.
export async function dealDog(env, player, date) {
  if (!isPuppyDay(player, date)) return { dog: rollDailyDog(player, date) };
  let parents = null;
  try {
    parents = await parentsFor(env, player, date);
  } catch (err) {
    log.warn("litter.parents_failed", { player, date, err });
  }
  if (!parents) return { dog: rollDailyDog(player, date) };
  return { dog: rollPuppy(player, date, parents), parents };
}

// Both parents' kennels list the puppy. Never fails the roll that made it.
export async function recordLitter(env, player, date, dog, parents, { name = "" } = {}) {
  if (!parents || dog.test) return;
  try {
    const kennel = await publicKennel(env, player);
    await Promise.all(parents.map((p) => env.STORE.put(litterKey(p.player, date, player), "", { metadata: {
      date,
      dog: dog.name,
      breed: dog.breed,
      score: dog.score,
      qualityEmoji: dog.qualityEmoji,
      parent: p.dog.name,
      owner: name || dog.player || "",
      kennel,
    } })));
  } catch (err) {
    log.warn("litter.record_failed", { player, date, err });
  }
}

// A kennel's Puppies shelf: every puppy its dogs have had, newest first.
export async function puppiesOf(env, player) {
  return (await listAll(env, `litter:${player}:`))
    .map((k) => k.metadata)
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date) || b.score - a.score);
}
