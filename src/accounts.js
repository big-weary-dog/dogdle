// Web accounts: a public username and an emoji PIN in front of a private player id.
//
// A web player has always been a random id in one browser's storage, and that id is the
// key to their daily roll -- so it could never be shown, and a new phone meant a new
// player. An account puts a name on it. The username is public (it's the kennel's address
// and what share links use); the player id behind it stays private, and signing in with
// the username and PIN is how another browser gets it back.
//
//   user:<username>          { handle, player, pin, created, discord? }
//   owner:<player>           { username, plays } -- also as metadata, so a list reads it
//   discordlink:<snowflake>  the username a Discord player is linked to
//   linkcode:<code>          a username waiting for `/dogdle link <code>`, ten minutes
//   pinfail:<username>       failed PIN attempts, for the lockout
//
// `plays` is the player id an account actually rolls as: its own, until it's linked to
// Discord, and the Discord player's from then on, so the website and the bot deal the
// same dog. Usernames are stored lowercase; `handle` keeps the capitals as typed.

import { PIN_EMOJI, PIN_MIN, PIN_MAX } from "../public/pin-emoji.js";
import { PLAYER_ID_RE, rollKey, dayKey } from "./keys.js";
import { log } from "./log.js";

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const LINK_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const LINK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, no 1/I
const LINK_TTL_SECONDS = 600;
const PIN_FAIL_LIMIT = 5;
const PIN_LOCK_SECONDS = 900;
// The Workers runtime caps PBKDF2 at 100,000 iterations.
const PIN_ITERATIONS = 100_000;
// Moving a history is five KV operations a dog, and a request gets a thousand.
const LINK_MAX_MOVES = 150;
// Never a username: these are paths, or would read as someone official.
const RESERVED = new Set(["all", "kennels", "admin", "dogdle", "api", "official", "mod", "moderator", "zach"]);

const userKey = (username) => `user:${username}`;
const ownerKey = (player) => `owner:${player}`;
const discordLinkKey = (discordId) => `discordlink:${discordId}`;
const linkCodeKey = (code) => `linkcode:${code}`;
const pinFailKey = (username) => `pinfail:${username}`;

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export const canonical = (raw) => String(raw || "").trim().toLowerCase();

export function usernameProblem(raw) {
  const handle = String(raw || "").trim();
  if (!USERNAME_RE.test(handle)) return "3 to 20 letters, numbers or underscores";
  const name = handle.toLowerCase();
  // `discord-` kennels are Discord players'; a username can't pose as one, or as a path.
  if (name.startsWith("discord") || RESERVED.has(name)) return "that one's reserved";
  return null;
}

// A PIN arrives as a list of keys, each of which must be on the keypad.
function pinProblem(pin) {
  if (!Array.isArray(pin) || pin.length < PIN_MIN || pin.length > PIN_MAX) return `${PIN_MIN} to ${PIN_MAX} emoji`;
  if (!pin.every((k) => PIN_EMOJI.includes(k))) return "only the keypad's emoji";
  return null;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16)));

async function derive(pin, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin.join("")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PIN_ITERATIONS }, key, 256);
  return hex(bits);
}

async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: await derive(pin, salt), iterations: PIN_ITERATIONS };
}

async function pinMatches(pin, stored) {
  const given = await derive(pin, unhex(stored.salt));
  let diff = given.length ^ stored.hash.length;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

const getUser = (env, username) => env.STORE.get(userKey(username), "json");

// The player id a browser's private id actually rolls as. One read, on every web route
// that takes a player: a linked account plays its Discord dog.
export async function playsAs(env, player) {
  const owner = await env.STORE.get(ownerKey(player), "json");
  return owner?.plays || player;
}

async function writeOwner(env, player, username, plays) {
  const row = { username, plays };
  await env.STORE.put(ownerKey(player), JSON.stringify(row), { metadata: row });
}

// Everything the public side needs to show an account without its private id: which
// player's dogs to read, and the URLs to show them at. A linked account is shown as its
// Discord player, whose URLs are already public in every embed.
export async function publicAccount(env, raw) {
  const username = canonical(raw);
  if (usernameProblem(username)) return null;
  const user = await getUser(env, username);
  if (!user) return null;
  return faceOf(username, user);
}

export function faceOf(username, user) {
  if (user.discord) {
    const player = `discord-${user.discord}`;
    return {
      username, handle: user.handle, player, discord: true,
      card: (o, date) => `${o}/i/${player}/${date}.gif`,
      album: (o, stamp) => `${o}/k/${player}/${stamp}.gif`,
    };
  }
  return {
    username, handle: user.handle, player: user.player, discord: false,
    card: (o, date) => `${o}/u/${username}/${date}.gif`,
    album: (o, stamp) => `${o}/u/${username}/album/${stamp}.gif`,
  };
}

// Every account's private id and username, for the mega-kennel. One list, metadata only.
export async function accountOwners(env) {
  const owners = new Map();
  let cursor;
  do {
    const listed = await env.STORE.list({ prefix: "owner:", cursor });
    for (const k of listed.keys) if (k.metadata?.username) owners.set(k.name.slice("owner:".length), k.metadata.username);
    cursor = listed.list_complete === false ? listed.cursor : undefined;
  } while (cursor);
  return owners;
}

async function body(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const accountView = (username, user) => ({
  username,
  handle: user.handle,
  discord: Boolean(user.discord),
  kennel: `/kennel/${username}`,
});

// /api/account and /api/account/*. None of it needs a token: the private id is itself the
// credential, and the PIN is what stands in for it on a new browser.
export async function handleAccount(request, url, env) {
  const route = url.pathname.replace(/^\/api\/account\/?/, "");

  // Who a browser is: its account, or none yet.
  if (route === "" && request.method === "GET") {
    const player = url.searchParams.get("player") || "";
    if (!PLAYER_ID_RE.test(player)) return json({ error: "invalid player id" }, 400);
    const owner = await env.STORE.get(ownerKey(player), "json");
    const user = owner && (await getUser(env, owner.username));
    return json(user ? accountView(owner.username, user) : { username: null });
  }

  // Whether a username is free, as it's typed. Usernames are public, so this gives nothing away.
  if (route === "check" && request.method === "GET") {
    const raw = url.searchParams.get("username") || "";
    const problem = usernameProblem(raw);
    if (problem) return json({ available: false, problem });
    const taken = await env.STORE.get(userKey(canonical(raw)), "stream");
    if (taken) await taken.cancel();
    return json({ available: !taken, ...(taken ? { problem: "taken" } : {}) });
  }

  // Put a username and PIN on a player id: the one this browser already has, dogs and all,
  // or a fresh one for someone new.
  if (route === "claim" && request.method === "POST") {
    const b = await body(request);
    const player = String(b?.player ?? "");
    const handle = String(b?.username ?? "").trim();
    if (!PLAYER_ID_RE.test(player) || player.startsWith("discord-")) return json({ error: "invalid player id" }, 400);
    const problem = usernameProblem(handle) || pinProblem(b?.pin);
    if (problem) return json({ error: problem }, 400);

    const username = canonical(handle);
    if (await env.STORE.get(ownerKey(player), "json")) return json({ error: "this browser already has an account" }, 409);
    if (await getUser(env, username)) return json({ error: "taken" }, 409);

    const user = { handle, player, pin: await hashPin(b.pin), created: new Date().toISOString() };
    await env.STORE.put(userKey(username), JSON.stringify(user));
    await writeOwner(env, player, username, player);
    log.info("account.claimed", { username });
    return json(accountView(username, user));
  }

  // Username and PIN in, private id out: how a second browser becomes the same player.
  if (route === "login" && request.method === "POST") {
    const b = await body(request);
    const username = canonical(b?.username);
    if (usernameProblem(username) || pinProblem(b?.pin)) return json({ error: "wrong username or PIN" }, 401);

    const fails = Number(await env.STORE.get(pinFailKey(username))) || 0;
    if (fails >= PIN_FAIL_LIMIT) return json({ error: "too many tries, wait fifteen minutes" }, 429);

    const user = await getUser(env, username);
    if (!user || !(await pinMatches(b.pin, user.pin))) {
      // Counted for unknown names too, so a miss looks the same either way.
      await env.STORE.put(pinFailKey(username), String(fails + 1), { expirationTtl: PIN_LOCK_SECONDS });
      log.warn("account.login_failed", { username, fails: fails + 1 });
      return json({ error: "wrong username or PIN" }, 401);
    }
    if (fails) await env.STORE.delete(pinFailKey(username));
    log.info("account.login", { username });
    return json({ ...accountView(username, user), player: user.player });
  }

  // A short-lived code for `/dogdle link <code>` in Discord.
  if (route === "link-code" && request.method === "POST") {
    const b = await body(request);
    const player = String(b?.player ?? "");
    if (!PLAYER_ID_RE.test(player)) return json({ error: "invalid player id" }, 400);
    const owner = await env.STORE.get(ownerKey(player), "json");
    const user = owner && (await getUser(env, owner.username));
    if (!user) return json({ error: "no account" }, 404);
    if (user.discord) return json({ error: "already linked" }, 409);

    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = [...bytes].map((n) => LINK_ALPHABET[n % LINK_ALPHABET.length]).join("");
    await env.STORE.put(linkCodeKey(code), owner.username, { expirationTtl: LINK_TTL_SECONDS });
    return json({ code, expiresIn: LINK_TTL_SECONDS });
  }

  return json({ error: "no such account route" }, 404);
}

// `/dogdle link <code>`, called by the bot with the caller's Discord id. From here on the
// account rolls as the Discord player, and its web dogs join that player's history -- on
// every day the Discord player hadn't rolled. A day both had a dog keeps the Discord one;
// the web dog stays where it was, on that day's board. Nothing is re-dealt: every moved
// dog is the stored roll, byte for byte.
export async function linkDiscord(env, discordId, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!LINK_CODE_RE.test(code)) return { status: 400, body: { error: "invalid code" } };

  const username = await env.STORE.get(linkCodeKey(code));
  if (!username) return { status: 404, body: { error: "unknown or expired code" } };
  const user = await getUser(env, username);
  if (!user) return { status: 404, body: { error: "unknown or expired code" } };
  if (user.discord) return { status: 409, body: { error: "that account is already linked" } };
  const already = await env.STORE.get(discordLinkKey(discordId));
  if (already) return { status: 409, body: { error: "this Discord account is already linked", username: already } };

  const web = user.player;
  const discord = `discord-${discordId}`;
  const listAll = async (prefix) => {
    const keys = [];
    let cursor;
    do {
      const listed = await env.STORE.list({ prefix, cursor });
      keys.push(...listed.keys);
      cursor = listed.list_complete === false ? listed.cursor : undefined;
    } while (cursor);
    return keys;
  };
  const taken = new Set((await listAll(`roll:${discord}:`)).map((k) => k.name.split(":").at(-1)));
  const webRolls = (await listAll(`roll:${web}:`)).map((k) => ({ date: k.name.split(":").at(-1), metadata: k.metadata }));

  let moved = 0;
  let kept = 0;
  let skipped = 0;
  for (const { date, metadata } of webRolls) {
    if (taken.has(date)) {
      // Discord already has this day's dog: it wins, and the web roll stays behind off the
      // board, so the day still shows one dog for this person.
      await env.STORE.delete(dayKey(date, web));
      kept++;
      continue;
    }
    if (moved >= LINK_MAX_MOVES) { skipped++; continue; }
    const value = await env.STORE.get(rollKey(web, date));
    if (!value) continue;
    await env.STORE.put(rollKey(discord, date), value, metadata ? { metadata } : {});
    // The day's board row moves with it, so the day shows one dog for this person.
    const { metadata: row } = await env.STORE.getWithMetadata(dayKey(date, web));
    if (row) {
      await env.STORE.put(dayKey(date, discord), "", { metadata: { ...row, discordId } });
      await env.STORE.delete(dayKey(date, web));
    }
    moved++;
  }
  if (skipped) log.warn("account.link_truncated", { username, moved, skipped });

  user.discord = discordId;
  await env.STORE.put(userKey(username), JSON.stringify(user));
  await env.STORE.put(discordLinkKey(discordId), username);
  await writeOwner(env, web, username, discord);
  await env.STORE.delete(linkCodeKey(code));
  log.info("account.linked", { username, moved, kept });
  return { status: 200, body: { username, handle: user.handle, moved, kept } };
}

// Keeps a linked account's board name and a web roll's row in step with Discord's rows.
export const webRow = (row, plays) =>
  plays.startsWith("discord-") ? { ...row, discordId: plays.slice("discord-".length) } : row;
