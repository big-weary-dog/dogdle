import { rollDailyDog, todayUTC } from "./roll.js";
import { BREEDS, photoEndpoint } from "./breeds.js";

const PLAYER_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const PHOTO_TIMEOUT_MS = 4000;
const MAX_CARD_BYTES = 2_000_000;
const CARD_TTL_SECONDS = 60 * 60 * 24 * 30;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const cardKey = (player, date) => `card:${player}:${date}`;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

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

    // Unlimited rerolls for playtesting. Everything it can reach is already public in the
    // client bundle, so there's nothing to gate -- it just skips the once-a-day lock.
    if (url.pathname === "/api/dev-roll") {
      const seed = url.searchParams.get("seed") || crypto.randomUUID();
      const dog = rollDailyDog(`dev-${seed}`, todayUTC());
      dog.photo = await fetchBreedPhoto(dog.breedSlug, dog.date);
      dog.devSeed = seed;

      return Response.json(dog, { headers: { "cache-control": "no-store" } });
    }

    // Drawing a cross-origin image onto a canvas taints it, and a tainted canvas can't be
    // exported. Re-serving dog.ceo photos from our own origin keeps the canvas clean.
    // Strictly host-locked: this must never become a general-purpose fetch proxy.
    if (url.pathname === "/img") {
      const target = url.searchParams.get("u") || "";
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        return new Response("bad url", { status: 400 });
      }
      if (parsed.protocol !== "https:" || parsed.hostname !== "images.dog.ceo") {
        return new Response("forbidden host", { status: 403 });
      }

      const upstream = await fetch(parsed.toString(), { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
      if (!upstream.ok) return new Response("upstream error", { status: 502 });

      const type = upstream.headers.get("content-type") || "";
      if (!type.startsWith("image/")) return new Response("not an image", { status: 502 });

      return new Response(upstream.body, {
        headers: { "content-type": type, "cache-control": "public, max-age=86400" },
      });
    }

    // The browser composites the live stage (back canvas + photo + front canvas + stats)
    // and posts the PNG here, so the embed shows exactly what the player saw, effects and
    // all. Keyed by player+date, so a given dog has at most one card.
    if (url.pathname === "/api/card" && request.method === "PUT") {
      const player = url.searchParams.get("player") || "";
      const date = url.searchParams.get("date") || "";
      if (!PLAYER_ID_RE.test(player) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return Response.json({ error: "bad params" }, { status: 400 });
      }

      const body = await request.arrayBuffer();
      if (body.byteLength > MAX_CARD_BYTES) {
        return Response.json({ error: "too large" }, { status: 413 });
      }
      // Only store things that really are PNGs, rather than whatever was posted.
      const magic = new Uint8Array(body.slice(0, 8));
      if (!PNG_MAGIC.every((b, i) => magic[i] === b)) {
        return Response.json({ error: "not a png" }, { status: 415 });
      }

      await env.CARDS.put(cardKey(player, date), body, {
        expirationTtl: CARD_TTL_SECONDS,
        metadata: { date },
      });

      return Response.json({ ok: true, url: `/i/${player}/${date}.png` });
    }

    if (url.pathname.startsWith("/i/")) {
      const [, , player, file] = url.pathname.split("/");
      const date = (file || "").replace(/\.png$/, "");
      if (!PLAYER_ID_RE.test(player || "") || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response("not found", { status: 404 });
      }

      const card = await env.CARDS.get(cardKey(player, date), "arrayBuffer");
      if (!card) return new Response("not found", { status: 404 });

      return new Response(card, {
        headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
      });
    }

    // Clears the local save and bounces back to the game. The roll is deterministic from
    // (player, date), so dropping only the cached result would deal the identical dog --
    // a genuine reroll needs a new player id, which is what this issues.
    if (url.pathname === "/reset") {
      const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Resetting…</title></head>
<body style="background:#0b0d12;color:#98a1b3;font-family:system-ui;padding:40px;text-align:center">
Resetting…
<script>
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("dogdle-")) localStorage.removeItem(k);
    }
  } catch {}
  location.replace("/");
</script>
</body>
</html>`;
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }

    // Share links are stateless: a dog is fully determined by (player, date), so this
    // re-rolls the same animal and serves OpenGraph tags that Discord/Slack unfurl into a
    // card with the real breed photo. No storage, nothing to expire.
    if (url.pathname.startsWith("/s/")) {
      const [, , player, date] = url.pathname.split("/");
      if (!PLAYER_ID_RE.test(player || "") || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
        return new Response("not found", { status: 404 });
      }

      const dog = rollDailyDog(player, date);

      // Prefer the card the player's browser rendered; fall back to the plain breed photo
      // if they never got far enough to upload one.
      const hasCard = (await env.CARDS.get(cardKey(player, date), "stream")) !== null;
      const photo = hasCard
        ? `${url.origin}/i/${player}/${date}.png`
        : await fetchBreedPhoto(dog.breedSlug, dog.date);

      const title = `${dog.name} the ${dog.breed} — ${dog.qualityLabel} (${dog.score > 0 ? "+" : ""}${dog.score})`;
      const description = [
        dog.background.name,
        ...dog.modifiers.map((m) => `${m.value >= 0 ? "+" : ""}${m.value} ${m.text}`),
      ].join(" · ");

      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
${photo ? `<meta property="og:image" content="${esc(photo)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="${esc(dog.qualityColor)}" />
<meta http-equiv="refresh" content="0; url=/" />
</head>
<body><a href="/">Dogdle</a></body>
</html>`;

      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
      });
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
