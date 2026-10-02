// Rendered images -- share cards and kennel albums -- and where they're kept.
//
// In R2 (the IMAGES binding) when there is one. A KV write can take a minute to reach other
// Cloudflare locations, and Discord's image proxy usually fetches a card from a different
// location than the one the bot's roll ran in: it got a 404 and showed a blank embed,
// which a retry a minute later didn't (the invisible dog). R2 is consistent everywhere the
// moment a write returns.
//
//   cards/<player>/<date>     a share card (test rolls under test/cards/...)
//   albums/<player>/<stamp>   a kennel album
//
// R2 has no per-object TTL: the bucket's lifecycle rules expire each prefix
// (.github/workflows/r2-setup.yml). KV is still read as a fallback, for images stored
// before the move and for a write R2 refused, and is where everything goes without the
// binding (tests, `npm run dev` without one).

import { cardKey, kennelKey } from "./keys.js";
import { log } from "./log.js";

const CARD_TTL_SECONDS = 60 * 60 * 24 * 30;
const TEST_TTL_SECONDS = 60 * 60 * 48;
// An album is redrawn whenever a dog is added, so an old one is only kept for a straggler.
const ALBUM_TTL_SECONDS = 60 * 60 * 24 * 7;

const cardObject = (player, date, test) => `${test ? "test/" : ""}cards/${player}/${date}`;
const albumObject = (player, stamp) => `albums/${player}/${stamp}`;

const contentType = (bytes) => {
  const b = bytes instanceof ArrayBuffer ? new Uint8Array(bytes, 0, 2) : new Uint8Array(bytes.buffer, bytes.byteOffset, 2);
  return b[0] === 0x89 && b[1] === 0x50 ? "image/png" : "image/gif";
};

async function put(env, object, kvKey, bytes, ttl, metadata) {
  if (env.IMAGES) {
    try {
      await env.IMAGES.put(object, bytes, { httpMetadata: { contentType: contentType(bytes) }, customMetadata: metadata });
      return;
    } catch (err) {
      log.warn("images.r2_put_failed", { object, err });
    }
  }
  await env.STORE.put(kvKey, bytes, { expirationTtl: ttl, metadata });
}

async function get(env, objects, kvKey) {
  if (env.IMAGES) {
    for (const object of objects) {
      try {
        const found = await env.IMAGES.get(object);
        if (found) return found.arrayBuffer();
      } catch (err) {
        log.warn("images.r2_get_failed", { object, err });
      }
    }
  }
  return env.STORE.get(kvKey, "arrayBuffer");
}

async function has(env, objects, kvKey) {
  if (env.IMAGES) {
    for (const object of objects) {
      try {
        if (await env.IMAGES.head(object)) return true;
      } catch (err) {
        log.warn("images.r2_head_failed", { object, err });
      }
    }
  }
  const stream = await env.STORE.get(kvKey, "stream");
  if (stream) await stream.cancel();
  return stream !== null;
}

// A card is a test card or not by its dog; reading one doesn't know which, so it tries both.
const cardObjects = (player, date) => [cardObject(player, date, false), cardObject(player, date, true)];

export const putCard = (env, player, date, bytes, { test = false } = {}) =>
  put(env, cardObject(player, date, test), cardKey(player, date), bytes,
    test ? TEST_TTL_SECONDS : CARD_TTL_SECONDS, { date });
export const getCard = (env, player, date) => get(env, cardObjects(player, date), cardKey(player, date));
export const hasCard = (env, player, date) => has(env, cardObjects(player, date), cardKey(player, date));

export const putAlbum = (env, player, stamp, bytes) =>
  put(env, albumObject(player, stamp), kennelKey(player, stamp), bytes, ALBUM_TTL_SECONDS, { stamp });
export const getAlbum = (env, player, stamp) => get(env, [albumObject(player, stamp)], kennelKey(player, stamp));
