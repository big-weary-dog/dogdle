import { rollDailyDog, rollPuppy, today } from "./roll.js";
import { handleBot, renderCard, kennelFor, kennelPageData, kennelPreview, kennelPage } from "./bot.js";
import { photoFor, backfillPhoto, PHOTO_HOST, PHOTO_TIMEOUT_MS } from "./photo.js";
import { PLAYER_ID_RE, DATE_RE, rollKey, dayKey, cleanName, boardRow, visibleRows } from "./keys.js";
import { megaKennel } from "./mega.js";
import { recordRoll, boardProgress } from "./progress.js";
import { dealDog, recordLitter } from "./litter.js";
import { handleAccount, playsAs, publicAccount, webRow } from "./accounts.js";
import { putCard, getCard, hasCard, getAlbum } from "./images.js";
import { log } from "./log.js";

const MAX_CARD_BYTES = 8_000_000; // animated cards are far heavier than a still
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38]; // "GIF8", covering 87a and 89a
const KENNEL_STAMP_RE = /^\d{4}-\d{2}-\d{2}-\d{1,4}$/;

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

// Every route runs inside this, so an exception anywhere is logged with enough to find it
// and answered as a 500 that names the ray id -- the one thing a player or the bot can
// quote back that matches a line in Workers Logs. Without it a throw is a bare 1101 page
// and, since the Worker keeps no logs of its own, gone.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      return await route(request, url, env);
    } catch (err) {
      const ray = request.headers.get("cf-ray") || "";
      log.error("request.failed", { method: request.method, path: url.pathname, ray, err });
      return Response.json(
        { error: "internal error", ray },
        { status: 500, headers: { "cache-control": "no-store" } }
      );
    }
  },
};

async function route(request, url, env) {
  if (url.pathname.startsWith("/api/bot/")) {
    return handleBot(request, url, env);
  }

  if (url.pathname === "/api/account" || url.pathname.startsWith("/api/account/")) {
    return handleAccount(request, url, env);
  }

  if (url.pathname === "/api/roll") {
    const browser = url.searchParams.get("player") || "";
    if (!PLAYER_ID_RE.test(browser)) {
      return Response.json({ error: "invalid player id" }, { status: 400 });
    }
    // A browser's id, or the Discord player its account is linked to (src/accounts.js).
    const player = await playsAs(env, browser);
    const date = today();
    const name = cleanName(url.searchParams.get("name"));

    // A roll is stored the first time and replayed forever after. Without this, editing
    // the content tables would silently re-deal every dog already shown that day.
    const saved = await env.STORE.get(rollKey(player, date), "json");
    if (saved) {
      // A roll whose photo never resolved repairs itself here rather than staying
      // pictureless until midnight.
      await backfillPhoto(env, rollKey(player, date), saved);
      return Response.json({ ...saved, replayed: true }, { headers: { "cache-control": "no-store" } });
    }

    // A peek reports whether today's dog exists without dealing one. Page load uses it,
    // so opening the site can't silently consume the roll before the lever is pulled.
    if (url.searchParams.get("peek")) {
      return Response.json({ pending: true }, { headers: { "cache-control": "no-store" } });
    }

    // Now and then a puppy (src/litter.js).
    const { dog, parents } = await dealDog(env, player, date);
    dog.photo = await photoFor(dog);
    dog.player = name;

    await env.STORE.put(rollKey(player, date), JSON.stringify(dog), {
      metadata: { date, score: dog.score, breed: dog.breed, name: dog.name, ...(dog.puppy ? { puppy: true } : {}) },
    });
    // The leaderboard reads entirely from list metadata, so it never fetches values.
    await env.STORE.put(dayKey(date, player), "", { metadata: webRow(boardRow(name, dog), player) });
    // The board's progress number: this dog's finds join the player's record (src/progress.js).
    await recordRoll(env, player, dog);
    await recordLitter(env, player, date, dog, parents, { name });

    return Response.json(dog, { headers: { "cache-control": "no-store" } });
  }

  // A name entered after rolling still needs to reach the board.
  if (url.pathname === "/api/name" && request.method === "POST") {
    const browser = url.searchParams.get("player") || "";
    const name = cleanName(url.searchParams.get("name"));
    if (!PLAYER_ID_RE.test(browser)) {
      return Response.json({ error: "invalid player id" }, { status: 400 });
    }
    const player = await playsAs(env, browser);

    const date = today();
    const saved = await env.STORE.get(rollKey(player, date), "json");
    if (!saved) return Response.json({ ok: false });

    await env.STORE.put(dayKey(date, player), "", { metadata: webRow(boardRow(name, saved), player) });
    return Response.json({ ok: true });
  }

  // Today's scores across everyone who has rolled.
  if (url.pathname === "/api/leaderboard") {
    const date = DATE_RE.test(url.searchParams.get("date") || "")
      ? url.searchParams.get("date")
      : today();

    const listed = await env.STORE.list({ prefix: `day:${date}:`, limit: 200 });
    // Each player's progress through the game rides on their row. The player id is only
    // the lookup key, read off the key name here and never put on the row.
    const playerOf = (k) => k.name.split(":").at(-1);
    const progress = await boardProgress(env, listed.keys.filter((k) => k.metadata && !k.metadata.test).map(playerOf));
    const keys = listed.keys.map((k) => {
      const p = k.metadata && progress.get(playerOf(k));
      return p ? { ...k, metadata: { ...k.metadata, progress: p } } : k;
    });
    // Rows written by the bot carry the player's Discord id; this endpoint is public.
    const rows = visibleRows(keys, false).map(({ discordId, ...row }) => row);

    return Response.json({ date, rows }, { headers: { "cache-control": "no-store" } });
  }

  // Every dog this player has been dealt, newest first.
  if (url.pathname === "/api/history") {
    const browser = url.searchParams.get("player") || "";
    if (!PLAYER_ID_RE.test(browser)) {
      return Response.json({ error: "invalid player id" }, { status: 400 });
    }
    const player = await playsAs(env, browser);

    const listed = await env.STORE.list({ prefix: `roll:${player}:`, limit: 200 });
    const rows = listed.keys
      .map((k) => k.metadata)
      .filter(Boolean)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return Response.json({ rows }, { headers: { "cache-control": "no-store" } });
  }

  // Unlimited rerolls for playtesting. Everything it can reach is already public in the
  // client bundle, so there's nothing to gate -- it just skips the once-a-day lock.
  // `frog=1` forces a frog, which otherwise turns up once in forty; `puppy=1` a puppy of
  // two made-up parents, which otherwise needs yesterday's board.
  if (url.pathname === "/api/dev-roll") {
    const seed = url.searchParams.get("seed") || crypto.randomUUID();
    const force = url.searchParams.get("frog") ? { frog: true } : {};
    const dog = url.searchParams.get("puppy")
      ? rollPuppy(`dev-${seed}`, today(), ["ma", "pa"].map((who) => ({
        dog: rollDailyDog(`dev-${seed}-${who}`, today(), { frog: false }), owner: who, kennel: null })))
      : rollDailyDog(`dev-${seed}`, today(), force);
    dog.photo = await photoFor(dog);
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

    let upstream;
    try {
      upstream = await fetch(parsed.toString(), { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
    } catch (err) {
      const timedOut = err?.name === "TimeoutError";
      log.warn("img.upstream_failed", { url: parsed.toString(), reason: timedOut ? "timeout" : "fetch", err });
      return new Response(timedOut ? "upstream timeout" : "upstream error", { status: timedOut ? 504 : 502 });
    }
    if (!upstream.ok) {
      log.warn("img.upstream_failed", { url: parsed.toString(), status: upstream.status });
      return new Response("upstream error", { status: 502 });
    }

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
    const browser = url.searchParams.get("player") || "";
    const date = url.searchParams.get("date") || "";
    if (!PLAYER_ID_RE.test(browser) || !DATE_RE.test(date)) {
      return Response.json({ error: "bad params" }, { status: 400 });
    }
    const player = await playsAs(env, browser);

    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_CARD_BYTES) {
      return Response.json({ error: "too large" }, { status: 413 });
    }
    // Only store real images, rather than whatever was posted.
    if (!sniffImageType(body)) {
      return Response.json({ error: "not a png or gif" }, { status: 415 });
    }

    await putCard(env, player, date, body);

    return Response.json({ ok: true, url: `/i/${player}/${date}.png` });
  }

  if (url.pathname.startsWith("/i/")) {
    const [, , player, file] = url.pathname.split("/");
    const date = (file || "").replace(/\.(png|gif)$/, "");
    if (!PLAYER_ID_RE.test(player || "") || !DATE_RE.test(date)) {
      return new Response("not found", { status: 404 });
    }
    // A Discord card is drawn server-side, so a missing one can be drawn again.
    return serveCard(request, env, player, date, player.startsWith("discord-"));
  }

  // A web account's cards and album, under its public username. The private id behind it
  // is looked up here and never appears in the URL. Every account's cards can be drawn on
  // demand, like a Discord player's: a browser may never have uploaded one.
  if (url.pathname.startsWith("/u/")) {
    const [, , username, file, extra] = url.pathname.split("/");
    const account = await publicAccount(env, username);
    if (!account) return new Response("not found", { status: 404 });
    if (file === "album") {
      const stamp = (extra || "").replace(/\.gif$/, "");
      if (!KENNEL_STAMP_RE.test(stamp)) return new Response("not found", { status: 404 });
      return serveAlbum(request, env, account.player, stamp);
    }
    const date = (file || "").replace(/\.(png|gif)$/, "");
    if (extra !== undefined || !DATE_RE.test(date)) return new Response("not found", { status: 404 });
    return serveCard(request, env, account.player, date, true);
  }

  // A player's whole collection, for the album page: a Discord player, or a web account by
  // username. Never by a web player's private id -- that's the key to their daily roll.
  if (url.pathname === "/api/kennel") {
    const owner = await kennelOwner(env, url.searchParams.get("player") || "");
    if (!owner) return Response.json({ error: "no such kennel" }, { status: 404 });
    const data = await kennelPageData(env, owner.player, url.origin, owner.face);
    return Response.json(data, { headers: { "cache-control": "public, max-age=60" } });
  }

  // The album page is static and reads the player from its own path. Its head is filled in
  // here, so a link pasted into Discord unfurls as "<name>'s Kennel" with the album image.
  const kennelPath = url.pathname.match(/^\/kennel\/(discord-\d{5,24}|[A-Za-z0-9_]{3,20})\/?$/);
  if (kennelPath) {
    const page = await env.ASSETS.fetch(new Request(new URL("/kennel", url)));
    const owner = page.ok ? await kennelOwner(env, kennelPath[1]) : null;
    const preview = owner ? await kennelPreview(env, owner.player, url.origin, owner.face) : null;
    if (!preview) return page;
    const title = `${preview.name ? `${preview.name}'s Kennel` : "Kennel"} · Dogdle`;
    const about = `${preview.days} ${preview.days === 1 ? "dog" : "dogs"} rolled on Dogdle.`;
    const head = `<title>${esc(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Dogdle" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(about)}" />
  <meta property="og:url" content="${esc(kennelPage(url.origin, owner.page))}" />
  <meta property="og:image" content="${esc(preview.image)}" />
  <meta property="og:image:width" content="560" />
  <meta property="og:image:height" content="420" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#65a30d" />`;
    const html = (await page.text()).replace(/<title>[^<]*<\/title>/, head);
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }

  // Every dog anyone has ever rolled, from the board index alone. Public, and built so
  // a web player's id never appears in it (see src/mega.js).
  if (url.pathname === "/api/kennels") {
    const data = await megaKennel(env, url.origin);
    return Response.json(data, { headers: { "cache-control": "public, max-age=60" } });
  }

  // The mega-kennel page. Its file is mega.html, not kennels.html: an asset at this path
  // would be served before the Worker runs, and the head would never be filled in.
  if (url.pathname === "/kennels" || url.pathname === "/kennels/") {
    const page = await env.ASSETS.fetch(new Request(new URL("/mega", url)));
    if (!page.ok) return page;
    const mega = await megaKennel(env, url.origin);
    const title = "The Mega-Kennel · Dogdle";
    const about = `${mega.dogs} ${mega.dogs === 1 ? "dog" : "dogs"} from ${mega.players} ${mega.players === 1 ? "player" : "players"}, all of them, all time.`;
    const head = `<title>${esc(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Dogdle" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(about)}" />
  <meta property="og:url" content="${esc(`${url.origin}/kennels`)}" />
  ${mega.cover ? `<meta property="og:image" content="${esc(mega.cover)}" />
  <meta property="og:image:width" content="560" />
  <meta property="og:image:height" content="320" />
  <meta name="twitter:card" content="summary_large_image" />` : ""}
  <meta name="theme-color" content="#65a30d" />`;
    const html = (await page.text()).replace(/<title>[^<]*<\/title>/, head);
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }

  // A Discord player's album, as named by /api/bot/kennel.
  if (url.pathname.startsWith("/k/")) {
    const [, , player, file] = url.pathname.split("/");
    const stamp = (file || "").replace(/\.gif$/, "");
    if (!PLAYER_ID_RE.test(player || "") || !player.startsWith("discord-") || !KENNEL_STAMP_RE.test(stamp)) {
      return new Response("not found", { status: 404 });
    }
    return serveAlbum(request, env, player, stamp);
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
    const stored = await hasCard(env, player, date);
    const fallback = stored ? null : await photoFor(dog);
    const photo = stored
      ? `${url.origin}/i/${player}/${date}.gif`
      : fallback && new URL(fallback, url.origin).toString(); // a frog's is a site path

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

  return env.ASSETS.fetch(request);
}

// Whose kennel a public address names: a Discord player by id, or a web account by its
// username. `face` says which URLs show it; left undefined, they're the Discord ones.
async function kennelOwner(env, id) {
  if (/^discord-\d{5,24}$/.test(id)) return { player: id, face: undefined, page: id };
  const account = await publicAccount(env, id);
  return account && { player: account.player, face: account, page: account.username };
}

// A stored card, or -- where `render` allows -- one drawn again from the stored roll: the
// render failed, or it expired, or this location hasn't seen the write yet. Bounded to
// rolls that exist, and stored once drawn, so this can't become a render-anything route.
async function serveCard(request, env, player, date, render) {
  let card = await getCard(env, player, date);
  if (!card && render) {
    const dog = await env.STORE.get(rollKey(player, date), "json");
    if (dog) {
      card = await renderCard(env, player, dog);
      log.warn("card.rendered_on_read", { player, date, ok: Boolean(card), colo: request.cf?.colo });
    }
  }

  if (!card) {
    log.warn("card.missing", { player, date, colo: request.cf?.colo, ua: request.headers.get("user-agent") });
    // Never let a proxy (Discord's included) hold on to a miss.
    return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
  }

  return new Response(card, {
    headers: {
      "content-type": sniffImageType(card) ?? "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}

// An album image. Like a card, a missing one is drawn again -- but only if the stamp is
// the album's current state, so this can't be used to render anything on demand.
async function serveAlbum(request, env, player, stamp) {
  let gif = await getAlbum(env, player, stamp);
  if (!gif) {
    gif = (await kennelFor(env, player, stamp))?.gif ?? null;
    log.warn("kennel.rendered_on_read", { player, stamp, ok: Boolean(gif), colo: request.cf?.colo });
  }
  if (!gif) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });

  return new Response(gif, {
    headers: { "content-type": "image/gif", "cache-control": "public, max-age=86400" },
  });
}
