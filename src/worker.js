import { rollDailyDog, todayUTC } from "./roll.js";
import { BREEDS, photoEndpoint } from "./breeds.js";

const PLAYER_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const PHOTO_TIMEOUT_MS = 4000;

// Dog CEO gives a random photo per call; we want the same photo all day for a given dog,
// so the result is cached in KV-less fashion via the Cloudflare cache keyed by breed+date.
async function fetchBreedPhoto(slug, dateStr) {
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
    return null; // frontend falls back to a rendered scene without a photo
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/roll") {
      const player = url.searchParams.get("player") || "";
      if (!PLAYER_ID_RE.test(player)) {
        return Response.json({ error: "invalid player id" }, { status: 400 });
      }

      const dog = rollDailyDog(player, todayUTC());
      dog.photo = await fetchBreedPhoto(dog.breedSlug, dog.date);

      return Response.json(dog, { headers: { "cache-control": "no-store" } });
    }

    // Checks every slug in our breed table against the live Dog CEO API. The sandbox this
    // was written in can't reach dog.ceo, so this is how we confirm the table post-deploy.
    if (url.pathname === "/api/verify-breeds") {
      const res = await fetch("https://dog.ceo/api/breeds/list/all");
      const body = await res.json();

      const valid = new Set();
      for (const [breed, subs] of Object.entries(body.message)) {
        valid.add(breed);
        for (const sub of subs) valid.add(`${breed}/${sub}`);
      }

      const missing = BREEDS.filter((b) => !valid.has(b.slug)).map((b) => b.slug);
      const unused = [...valid].filter((s) => !BREEDS.some((b) => b.slug === s));

      return Response.json({
        ok: missing.length === 0,
        total: BREEDS.length,
        missing,
        unusedInApi: unused,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
