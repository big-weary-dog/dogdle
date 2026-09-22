// Dog CEO photo lookup, shared by the web routes and the bot card renderer.

import { BREEDS, photoEndpoint } from "./breeds.js";

export const PHOTO_HOST = "images.dog.ceo";
export const PHOTO_TIMEOUT_MS = 4000;
const MAX_PHOTO_BYTES = 6_000_000;

// Dog CEO gives a random photo per call; we want the same photo all day for a given dog,
// so the result is cached in the Cloudflare cache keyed by breed+date.
export async function fetchBreedPhoto(slug, dateStr) {
  const cacheKey = new Request(`https://dogdle.internal/photo/${slug}/${dateStr}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return (await hit.json()).url;

  try {
    const res = await fetch(photoEndpoint(slug), {
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (body.status !== "success" || typeof body.message !== "string") return null;

    await cache.put(
      cacheKey,
      new Response(JSON.stringify({ url: body.message }), {
        headers: { "content-type": "application/json", "cache-control": "max-age=86400" },
      })
    );
    return body.message;
  } catch {
    return null; // callers fall back to a rendered scene with no photo
  }
}

// A roll is immutable so that editing the content tables can't re-deal a dog somebody has
// already been shown. The photo URL is the one part of a stored roll that isn't a dealt
// outcome -- it's decoration, resolved by a network call that can simply fail, and when it
// does the player stares at a photo-less dog for the rest of their day.
//
// So: fill it in on read, and keep it. The dog itself is untouched.
// Returns whether it actually repaired anything, because a caller that has already
// rendered something from the photo-less dog needs to throw that away.
export async function backfillPhoto(env, key, dog) {
  if (dog.photo || dog.test) return false;

  // Look the slug up again by breed name rather than trusting the stored one. A slug is a
  // lookup key into someone else's API, not part of the dog: when one turns out to be
  // wrong, every dog already dealt under it has the broken value baked in, and retrying it
  // just reproduces the same 404 forever. The name is the stable identity.
  const current = BREEDS.find((b) => b.name === dog.breed);
  const slug = current?.slug ?? dog.breedSlug;

  const photo = await fetchBreedPhoto(slug, dog.date);
  if (!photo) return false; // still unreachable; try again next load

  dog.breedSlug = slug;
  dog.photo = photo;
  // A put replaces metadata, and the leaderboard reads entirely from metadata.
  const { metadata } = await env.STORE.getWithMetadata(key);
  await env.STORE.put(key, JSON.stringify(dog), metadata ? { metadata } : {});
  return true;
}

// The bytes themselves, for the headless renderer. Host-locked like /img is: this only
// ever fetches what fetchBreedPhoto handed back.
export async function fetchPhotoBytes(photoUrl) {
  if (!photoUrl) return null;
  try {
    const parsed = new URL(photoUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== PHOTO_HOST) return null;

    const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_PHOTO_BYTES) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
