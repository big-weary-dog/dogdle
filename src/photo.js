// Dog CEO photo lookup, shared by the web routes and the bot card renderer.

import { photoEndpoint } from "./breeds.js";

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
