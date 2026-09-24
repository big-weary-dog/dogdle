// The Discord bot API.
//
// The bot owns the schedule: it calls POST /api/bot/roll when a user asks for their dog,
// and this deals one, renders the card server-side and hands back both the image URL and
// the pieces of a message. Nothing here is a cron -- the Worker never wakes on its own.
//
// Discord users are their own players: a Discord id maps to `discord-<snowflake>`, which
// never collides with the web game's UUIDs, so rolling in Discord doesn't consume the
// roll on swampkat and vice versa. Scores from both land on the same global board; a
// guild-scoped index is written as well so a server can see only its own people.
//
// Every route needs `Authorization: Bearer <BOT_TOKEN>`. An unauthenticated roll endpoint
// would let anyone burn someone else's day.

import { rollDailyDog, today } from "./roll.js";
import { renderCardGif } from "./card.js";
import { fetchBreedPhoto, fetchPhotoBytes, backfillPhoto } from "./photo.js";
import { cardKey, rollKey, dayKey, guildKey, cleanName, boardRow, visibleRows, DATE_RE } from "./keys.js";
import { log } from "./log.js";

const SNOWFLAKE_RE = /^\d{5,24}$/;
const CARD_TTL_SECONDS = 60 * 60 * 24 * 30;
// A smoke test shouldn't leave anything behind that someone has to go and delete.
const TEST_TTL_SECONDS = 60 * 60 * 48;
const BOARD_LIMIT = 200;

export const botPlayerId = (discordId) => `discord-${discordId}`;
const cardUrl = (origin, player, date) => `${origin}/i/${player}/${date}.gif`;

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

// Constant-time so a wrong token can't be narrowed down a byte at a time.
function tokenMatches(given, expected) {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function authorize(request, env) {
  const expected = env.BOT_TOKEN;
  // Refuse rather than run open: a missing secret must not mean "no auth required".
  if (!expected) return json({ error: "bot api not configured" }, 503);

  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!tokenMatches(given, expected)) return json({ error: "unauthorized" }, 401);

  return null;
}

// What the bot needs to post: the traits are already drawn into the card's sidebar, so
// the text is a one-liner and the image carries the rest.
function present(dog, imageUrl, origin) {
  return {
    name: dog.name,
    breed: dog.breed,
    rarity: dog.rarityLabel,
    rarityColor: dog.rarityColor,
    score: dog.score,
    quality: dog.qualityLabel,
    qualityColor: dog.qualityColor,
    // So a bot can label a tier without hardcoding the ladder.
    qualityEmoji: dog.qualityEmoji,
    date: dog.date,
    background: {
      name: dog.background.name,
      emoji: dog.background.emoji,
      value: dog.background.value,
    },
    traits: dog.modifiers.map((m) => ({ text: m.text, emoji: m.emoji, value: m.value })),
    image: imageUrl,
    link: `${origin}/`,
    text: `${dog.name} the ${dog.breed} — ${dog.qualityLabel} (${signed(dog.score)})`,
  };
}

export const cardTtl = (dog) => (dog.test ? TEST_TTL_SECONDS : CARD_TTL_SECONDS);

// Draws a dog's card and stores it. Never throws: the card is decoration on a roll that
// has already been dealt and saved, so a failure here must not turn into a failed roll.
// Returns the bytes, or null if even a photo-less card couldn't be drawn.
export async function renderCard(env, player, dog) {
  const started = Date.now();
  const photo = await fetchPhotoBytes(dog.photo);

  let gif;
  try {
    gif = renderCardGif(dog, { photo });
  } catch (err) {
    // A photo the decoder chokes on shouldn't cost the player their whole card.
    log.error("card.render_failed", { player, date: dog.date, withPhoto: Boolean(photo), err });
    if (!photo) return null;
    try {
      gif = renderCardGif(dog);
    } catch (again) {
      log.error("card.render_failed", { player, date: dog.date, withPhoto: false, err: again });
      return null;
    }
  }

  try {
    await env.STORE.put(cardKey(player, dog.date), gif, {
      expirationTtl: cardTtl(dog),
      metadata: { date: dog.date },
    });
  } catch (err) {
    // The image route draws a missing card on demand, so this heals on first view.
    log.error("card.store_failed", { player, date: dog.date, err });
  }

  log.info("card.rendered", {
    player,
    date: dog.date,
    photo: Boolean(photo),
    bytes: gif.byteLength,
    ms: Date.now() - started,
  });
  return gif;
}

// Leaderboard rows are rewritten on every call, and KV refuses a second write to one key
// inside a second -- a retry or a double-click would otherwise fail a roll that worked.
async function writeIndex(env, key, value, opts) {
  try {
    await env.STORE.put(key, value, opts);
  } catch (err) {
    log.warn("board.write_failed", { key, err });
  }
}

export async function handleBot(request, url, env) {
  const denied = authorize(request, env);
  if (denied) return denied;

  const route = url.pathname.slice("/api/bot/".length);

  if (route === "roll" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "body must be json" }, 400);
    }

    const discordId = String(body?.discordId ?? "");
    const guildId = String(body?.guildId ?? "");
    if (!SNOWFLAKE_RE.test(discordId)) return json({ error: "invalid discordId" }, 400);
    if (guildId && !SNOWFLAKE_RE.test(guildId)) return json({ error: "invalid guildId" }, 400);

    const player = botPlayerId(discordId);
    const date = today();
    const name = cleanName(body?.displayName);

    // A `test` roll is a real roll -- same dog, same card -- that simply doesn't count:
    // it's hidden from every board and everything it writes expires in two days, so
    // smoke-testing the live Worker leaves nothing for anyone to clean up.
    const isTest = body?.test === true;
    const expiry = isTest ? { expirationTtl: TEST_TTL_SECONDS } : {};

    // One dog per person per day. A stored roll is replayed verbatim, so editing the
    // content tables never re-deals a dog somebody has already been shown.
    const saved = await env.STORE.get(rollKey(player, date), "json");
    const dog = saved ?? rollDailyDog(player, date);
    // Same repair as the web route: a photo that never resolved is filled in on read.
    // The card was rendered without it and cached for a month, so it's drawn again.
    const repaired = Boolean(saved) && (await backfillPhoto(env, rollKey(player, date), dog));
    if (!saved) {
      dog.photo = await fetchBreedPhoto(dog.breedSlug, dog.date);
      dog.player = name;
      dog.source = "discord";
      if (isTest) dog.test = true;
      await env.STORE.put(rollKey(player, date), JSON.stringify(dog), {
        ...expiry,
        metadata: { date, score: dog.score, breed: dog.breed, name: dog.name, test: dog.test },
      });
    }

    // discordId rides along so a digest can @mention the player and find their card
    // without a second lookup. The public web board strips it.
    const row = { ...boardRow(name || saved?.player || "anon", dog), discordId };
    await writeIndex(env, dayKey(date, player), "", { ...expiry, metadata: row });
    // Written on every call, not just the first: someone who rolled in one server and
    // asked again in another should appear on both boards.
    if (guildId) await writeIndex(env, guildKey(guildId, date, player), "", { ...expiry, metadata: row });

    // A fresh roll can't have a card yet, so it isn't looked up first. Asking KV for a key
    // that doesn't exist caches the miss, and other locations can keep answering "not
    // found" for up to a minute after the write -- which is when Discord fetches it.
    let card = "cached";
    if (!saved || repaired) {
      card = (await renderCard(env, player, dog)) ? "rendered" : "failed";
    } else {
      const existing = await env.STORE.get(cardKey(player, date), "stream");
      if (existing) await existing.cancel();
      else card = (await renderCard(env, player, dog)) ? "rendered" : "failed";
    }

    log.info("bot.roll", { player, date, guildId: guildId || null, replayed: Boolean(saved), repaired, card, test: isTest });

    return json({
      ...present(dog, cardUrl(url.origin, player, date), url.origin),
      replayed: Boolean(saved),
    });
  }

  // Today's dog without dealing one -- for a bot that wants to say "you already rolled".
  if (route === "dog" && request.method === "GET") {
    const discordId = url.searchParams.get("discordId") || "";
    if (!SNOWFLAKE_RE.test(discordId)) return json({ error: "invalid discordId" }, 400);

    const player = botPlayerId(discordId);
    const date = url.searchParams.get("date") || today();
    if (!DATE_RE.test(date)) return json({ error: "invalid date" }, 400);

    const saved = await env.STORE.get(rollKey(player, date), "json");
    if (!saved) return json({ pending: true, date });

    return json({
      ...present(saved, cardUrl(url.origin, player, date), url.origin),
      replayed: true,
    });
  }

  if (route === "leaderboard" && request.method === "GET") {
    const guildId = url.searchParams.get("guildId") || "";
    if (guildId && !SNOWFLAKE_RE.test(guildId)) return json({ error: "invalid guildId" }, 400);

    const date = url.searchParams.get("date") || today();
    if (!DATE_RE.test(date)) return json({ error: "invalid date" }, 400);

    // No guild means the global board, the same one the website shows.
    const prefix = guildId ? `guild:${guildId}:${date}:` : `day:${date}:`;
    const listed = await env.STORE.list({ prefix, limit: BOARD_LIMIT });
    const rows = visibleRows(listed.keys, url.searchParams.get("includeTest") === "1").map(
      // Web players have no Discord id and no card rendered for them, so no image.
      (r) => (r.discordId ? { ...r, image: cardUrl(url.origin, botPlayerId(r.discordId), date) } : r)
    );

    return json({ date, guildId: guildId || null, rows });
  }

  if (route === "history" && request.method === "GET") {
    const discordId = url.searchParams.get("discordId") || "";
    if (!SNOWFLAKE_RE.test(discordId)) return json({ error: "invalid discordId" }, 400);

    const listed = await env.STORE.list({
      prefix: `roll:${botPlayerId(discordId)}:`,
      limit: BOARD_LIMIT,
    });
    const rows = listed.keys
      .map((k) => k.metadata)
      .filter(Boolean)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return json({ rows });
  }

  return json({ error: "no such bot route" }, 404);
}
