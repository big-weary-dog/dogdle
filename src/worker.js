import { rollDailyDog, today } from "./roll.js";
import { renderCardGif } from "./card.js";
import { BREEDS } from "./breeds.js";
import { handleBot } from "./bot.js";
import { fetchBreedPhoto, fetchPhotoBytes, PHOTO_HOST, PHOTO_TIMEOUT_MS } from "./photo.js";
import { PLAYER_ID_RE, DATE_RE, cardKey, rollKey, dayKey, cleanName, boardRow, visibleRows } from "./keys.js";

const MAX_CARD_BYTES = 8_000_000; // animated cards are far heavier than a still
const CARD_TTL_SECONDS = 60 * 60 * 24 * 30;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38]; // "GIF8", covering 87a and 89a

// Cards may be a still or an animation; the stored bytes decide how they're served.
function sniffImageType(buf) {
  const head = new Uint8Array(buf.slice(0, 8));
  if (PNG_MAGIC.every((b, i) => head[i] === b)) return "image/png";
  if (GIF_MAGIC.every((b, i) => head[i] === b)) return "image/gif";
  return null;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/bot/")) {
      return handleBot(request, url, env);
    }

    if (url.pathname === "/api/roll") {
      const player = url.searchParams.get("player") || "";
      if (!PLAYER_ID_RE.test(player)) {
        return Response.json({ error: "invalid player id" }, { status: 400 });
      }
      const date = today();
      const name = cleanName(url.searchParams.get("name"));

      // A roll is stored the first time and replayed forever after. Without this, editing
      // the content tables would silently re-deal every dog already shown that day.
      const saved = await env.STORE.get(rollKey(player, date), "json");
      if (saved) {
        return Response.json({ ...saved, replayed: true }, { headers: { "cache-control": "no-store" } });
      }

      // A peek reports whether today's dog exists without dealing one. Page load uses it,
      // so opening the site can't silently consume the roll before the lever is pulled.
      if (url.searchParams.get("peek")) {
        return Response.json({ pending: true }, { headers: { "cache-control": "no-store" } });
      }

      const dog = rollDailyDog(player, date);
      dog.photo = await fetchBreedPhoto(dog.breedSlug, dog.date);
      dog.player = name;

      await env.STORE.put(rollKey(player, date), JSON.stringify(dog), {
        metadata: { date, score: dog.score, breed: dog.breed, name: dog.name },
      });
      // The leaderboard reads entirely from list metadata, so it never fetches values.
      await env.STORE.put(dayKey(date, player), "", { metadata: boardRow(name, dog) });

      return Response.json(dog, { headers: { "cache-control": "no-store" } });
    }

    // A name entered after rolling still needs to reach the board.
    if (url.pathname === "/api/name" && request.method === "POST") {
      const player = url.searchParams.get("player") || "";
      const name = cleanName(url.searchParams.get("name"));
      if (!PLAYER_ID_RE.test(player)) {
        return Response.json({ error: "invalid player id" }, { status: 400 });
      }

      const date = today();
      const saved = await env.STORE.get(rollKey(player, date), "json");
      if (!saved) return Response.json({ ok: false });

      await env.STORE.put(dayKey(date, player), "", { metadata: boardRow(name, saved) });
      return Response.json({ ok: true });
    }

    // Today's scores across everyone who has rolled.
    if (url.pathname === "/api/leaderboard") {
      const date = DATE_RE.test(url.searchParams.get("date") || "")
        ? url.searchParams.get("date")
        : today();

      const listed = await env.STORE.list({ prefix: `day:${date}:`, limit: 200 });
      const rows = visibleRows(listed.keys, false);

      return Response.json({ date, rows }, { headers: { "cache-control": "no-store" } });
    }

    // Every dog this player has been dealt, newest first.
    if (url.pathname === "/api/history") {
      const player = url.searchParams.get("player") || "";
      if (!PLAYER_ID_RE.test(player)) {
        return Response.json({ error: "invalid player id" }, { status: 400 });
      }

      const listed = await env.STORE.list({ prefix: `roll:${player}:`, limit: 200 });
      const rows = listed.keys
        .map((k) => k.metadata)
        .filter(Boolean)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

      return Response.json({ rows }, { headers: { "cache-control": "no-store" } });
    }

    // Unlimited rerolls for playtesting. Everything it can reach is already public in the
    // client bundle, so there's nothing to gate -- it just skips the once-a-day lock.
    if (url.pathname === "/api/dev-roll") {
      const seed = url.searchParams.get("seed") || crypto.randomUUID();
      const dog = rollDailyDog(`dev-${seed}`, today());
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
      if (parsed.protocol !== "https:" || parsed.hostname !== PHOTO_HOST) {
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
      if (!PLAYER_ID_RE.test(player) || !DATE_RE.test(date)) {
        return Response.json({ error: "bad params" }, { status: 400 });
      }

      const body = await request.arrayBuffer();
      if (body.byteLength > MAX_CARD_BYTES) {
        return Response.json({ error: "too large" }, { status: 413 });
      }
      // Only store real images, rather than whatever was posted.
      if (!sniffImageType(body)) {
        return Response.json({ error: "not a png or gif" }, { status: 415 });
      }

      await env.STORE.put(cardKey(player, date), body, {
        expirationTtl: CARD_TTL_SECONDS,
        metadata: { date },
      });

      return Response.json({ ok: true, url: `/i/${player}/${date}.png` });
    }

    if (url.pathname.startsWith("/i/")) {
      const [, , player, file] = url.pathname.split("/");
      const date = (file || "").replace(/\.(png|gif)$/, "");
      if (!PLAYER_ID_RE.test(player || "") || !DATE_RE.test(date)) {
        return new Response("not found", { status: 404 });
      }

      const card = await env.STORE.get(cardKey(player, date), "arrayBuffer");
      if (!card) return new Response("not found", { status: 404 });

      return new Response(card, {
        headers: {
          "content-type": sniffImageType(card) ?? "image/png",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    // Renders a throwaway card on demand, for eyeballing the renderer the bot uses. The
    // bot's own cards come from /api/bot/roll, which stores them; this one is never kept.
    if (url.pathname === "/api/render-card") {
      const seed = url.searchParams.get("seed") || crypto.randomUUID();
      const dog = rollDailyDog(`dev-${seed}`, today());
      dog.photo = await fetchBreedPhoto(dog.breedSlug, dog.date);
      const gif = renderCardGif(dog, { photo: await fetchPhotoBytes(dog.photo) });
      return new Response(gif, {
        headers: { "content-type": "image/gif", "cache-control": "no-store" },
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
      if (!PLAYER_ID_RE.test(player || "") || !DATE_RE.test(date || "")) {
        return new Response("not found", { status: 404 });
      }

      const dog = (await env.STORE.get(rollKey(player, date), "json")) ?? rollDailyDog(player, date);

      // Prefer the card the player's browser rendered; fall back to the plain breed photo
      // if they never got far enough to upload one.
      const hasCard = (await env.STORE.get(cardKey(player, date), "stream")) !== null;
      const photo = hasCard
        ? `${url.origin}/i/${player}/${date}.gif`
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
