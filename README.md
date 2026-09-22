# Dogdle

One dog. Once a day. No rerolls.

Live at **[dogdle.swampkat.com](https://dogdle.swampkat.com)**.

Pull the lever and you get a dog for the day: a real breed with a real photo, a name, a
place it happens to be standing, and a handful of traits that are either an asset or a
liability. The traits add up to a score, everyone who played that day lands on a
leaderboard, and the result copies out as an animated GIF you can paste into Discord.

Rolls are permanent. Whatever you were dealt is what you have until midnight Eastern.

---

## How a dog is made

Every dog is four independent rolls, combined:

| Part | Source | Notes |
|---|---|---|
| **Breed** | `src/breeds.js` | ~130 breeds, each mapped to a [Dog CEO](https://dog.ceo/dog-api/) slug so a real photo exists. Rarity follows real-world prevalence — Labradors are common, Otterhounds are legendary. |
| **Background** | `src/content.js` | 46 scenes with their own rarity weights, deliberately flatter than the breed table so a boring scene only turns up ~30% of the time. |
| **Name** | `src/content.js` | Flat pick from a list. |
| **Traits** | `src/content.js` | 4–8 of them, averaging 6, drawn without replacement. |

**Score** = the background's value + every trait's value. The content is balanced so the
average dog scores **0** — see [Balance](#balance).

The roll is deterministic: `hash(playerId + date)` seeds a PRNG, so the same player on the
same day always produces the same dog. That is what lets a share link re-create a dog
without storing anything.

### Rarity vs. quality

These are separate axes and it is worth keeping them straight:

- **Rarity** (Common → Legendary) describes how unusual the *breed* is. It has no effect
  on score.
- **Quality** (Should Not Have Happened → Platonic Ideal of Dog) is nine tiers derived
  from the score.

So a Common Labrador can be a Platonic Ideal, and a Legendary Xoloitzcuintli can be a
disaster. That tension is most of the fun.

---

## Visuals

Each background and trait declares its visual as data — `{ type, layer, params }` — which
`public/effects.js` renders. The **layer** is what gives a scene any depth:

| Layer | Where it draws | Example |
|---|---|---|
| `back` | The world behind the dog | aurora, holy rays, starfields |
| `front` | Between the viewer and the dog, occluding it | snow, embers, confetti, fog |
| `subject` | CSS applied to the photo itself | `drain` desaturates, `wobble` sways, `halo` glows |

The stage is two canvases with the photo sandwiched between them, so front-layer effects
genuinely pass in front of the animal.

Backgrounds can also declare **props** — a few silhouettes in relative coordinates
(`rect`, `ellipse`, `tri`, `hills`) drawn behind the dog. Without them every scene was a
sky gradient over a flat band, and 46 different places looked like one place in different
colours.

Trait emoji appear in a fixed rail down the right edge of the stage. They used to orbit
the dog, which read as scattered clip art; a fixed rail reads as designed.

### Adding a trait

Append to `MODIFIERS` in `src/content.js`:

```js
{ text: "Has a nemesis", emoji: "😾", value: -2, category: "circumstance",
  effect: { type: "vignette", layer: "front", params: { color: "#1c1917", opacity: 0.5 } } },
```

`effect` may be `null` — the emoji badge still shows. Then run `npm test`, which will tell
you if the effect type doesn't exist or the layer is wrong, and whether the balance moved.

**Never delete a trait.** Mark it `obsolete: true` instead. Stored dogs still reference
their traits by value, so a deleted one would break every dog already carrying it. An
obsolete trait stays resolvable but never spawns again.

---

## Balance

The average dog scores 0 by construction, not by moving the goalposts.

With a rarity-weighted background mean of about **+1.04** and six traits per dog, the trait
pool has to average **−0.174** for the whole thing to centre on zero. When new traits push
it off, the correction is spread **one point at a time across distinct traits** in the
−4…−2 band. Concentrating it on the harshest traits — which a greedy pass does by default —
flattens the tail and takes the drama out of an extreme roll.

Backgrounds are deliberately left lopsided (Heaven +12, Hell −7). They are the jackpots.

Measured over 40k rolls: mean −0.05, median 0, tiers landing at roughly
0.4 / 4.5 / 13.8 / 21.7 / **20.9** / 20.4 / 12.9 / 4.7 / 0.6.

`npm test` fails if the mean drifts past ±0.5.

---

## Architecture

A single Cloudflare Worker serves both the API and the static assets.

```
src/
  worker.js    routes: roll, leaderboard, history, card upload/serve, image proxy, share page
  bot.js       the Discord bot API (/api/bot/*)
  roll.js      the deterministic generator and the Eastern day boundary
  content.js   backgrounds, traits, names, tier thresholds
  breeds.js    breed table and rarity weights
  keys.js      the KV key layout, shared by the web routes and the bot
  photo.js     Dog CEO lookup and photo bytes
  card.js      the headless card renderer — scene, dog, trait sidebar, GIF
  raster.js    a pixel-buffer implementation of the slice of Canvas 2D effects.js uses
  draw.js      text, emoji and photo blitting over that buffer
  generated/   atlas.js — baked glyphs and emoji (built, committed, not edited)
  vendor/      jpeg-decoder.js, vendored (Workers have no image decoder)
public/
  index.html   the game
  app.js       roll, render, capture the GIF, leaderboard
  dev.js/html  /dev — unlimited rerolls for playtesting
  effects.js   the canvas renderer: effect types, layers, props, subject CSS
  vendor/      gifenc, vendored (see package.json devDependencies for the source)
scripts/
  build-atlas.mjs   bakes the glyph/emoji atlas with a headless browser
test/          node:test suites — content, roll, effects, card, bot
```

### Storage

One KV namespace, separated by key prefix:

| Key | Holds |
|---|---|
| `roll:<player>:<date>` | The full dog, written once and replayed forever after |
| `day:<date>:<player>` | Leaderboard entry — summary lives in **list metadata**, so the board is one `list` call and never fetches values |
| `guild:<guild>:<date>:<player>` | The same row, scoped to one Discord server |
| `card:<player>:<date>` | The rendered share GIF, 30-day TTL |

**Rolls are immutable.** The first roll of a day is stored; every later load replays it.
Without that, editing the content tables would silently re-deal every dog already shown.
Page load uses `?peek=1`, which reports whether a dog exists *without* creating one —
otherwise merely opening the site would consume your day.

### Share cards

The browser composites the live stage into a 480px, 16-frame GIF (~300–400KB) and uploads
it. The share text links the GIF **directly**, because a raw image URL unfurls in Discord
as a bare image, where a page with OpenGraph tags unfurls as a card with title and
description chrome.

Two non-obvious constraints:

- Drawing a cross-origin image onto a canvas **taints** it, and a tainted canvas cannot be
  exported at all. Dog CEO photos are therefore re-served through `/img`, which is
  hard-locked to `images.dog.ceo` and must never become a general-purpose fetch proxy.
- GIF is capped at 256 colours and grows fast with size and frame count, hence 480px. One
  palette is quantised from the first frame and reused for the rest, which compresses far
  better than quantising each frame.

`/s/<player>/<date>` still serves an OpenGraph page. Nothing in the app links to it any
more, but links shared before the format changed are live, so it stays.

---

## Discord bot API

A bot owns its own schedule: it calls `POST /api/bot/roll` when someone asks for their
dog, and the Worker deals one, renders the card and hands back an image URL. Nothing here
is a cron — the Worker never wakes on its own.

**Discord users are their own players.** A snowflake maps to `discord-<id>`, which can't
collide with the web game's UUIDs, so rolling in Discord doesn't consume the roll on the
website and vice versa. Scores from both land on the same global board; a guild-scoped
index is written as well, so a server can show only its own people.

Every route needs `Authorization: Bearer $BOT_TOKEN` (a Worker secret). An open roll
endpoint would let anyone burn someone else's day. With no secret set the API answers
`503` — a missing token must never mean "no auth required".

| Route | Does |
|---|---|
| `POST /api/bot/roll` | `{ discordId, guildId?, displayName? }` → deals today's dog, or replays it. Idempotent. |
| `GET /api/bot/dog?discordId=&date=` | Today's dog **without** dealing one — `{ pending: true }` if they haven't rolled. |
| `GET /api/bot/leaderboard?guildId=&date=` | Scores for a date. No `guildId` gives the global board. |
| `GET /api/bot/history?discordId=` | Every dog that player has been dealt, newest first. |

A roll answers with the pieces of a message, not a formatted one:

```json
{
  "name": "Jellybean", "breed": "Bluetick Coonhound",
  "rarity": "Common", "score": 1, "quality": "Perfectly Average",
  "background": { "name": "A Parking Lot at Night", "emoji": "🎫", "value": -1 },
  "traits": [{ "text": "Local celebrity", "emoji": "👑", "value": 6 }],
  "image": "https://dogdle.swampkat.com/i/discord-1234.../2026-09-22.gif",
  "text": "Jellybean the Bluetick Coonhound — Perfectly Average (+1)",
  "replayed": false
}
```

`image` is a plain GIF URL, so posting it bare unfurls as an image with no card chrome.
The traits are already drawn into the card's sidebar, which is the point: the message can
be mostly the GIF.

### Rendering a card without a canvas

Workers have no canvas, no DOM and no image decoder, so the card is rendered onto a plain
pixel buffer:

- `src/raster.js` implements the 25 members of Canvas 2D that `public/effects.js` actually
  calls (shadows and filters are accepted and ignored). The point is that **effects.js runs
  unchanged** — the alternative was a second implementation of every effect, which would
  drift the first time anyone added one.
- Glyphs and emoji can't be rasterised at runtime, so `scripts/build-atlas.mjs` bakes them
  with a headless browser into `src/generated/atlas.js` — text as alpha coverage (so it can
  be tinted), emoji as RGBA. **Add an emoji to the content tables and you must re-run it**;
  `npm test` fails if the atlas is missing one.
- Breed photos are JPEG, decoded by a vendored pure-JS decoder.

The world and the sidebar are static, so both are painted once and copied per frame —
profiling showed `paintWorld` was 509ms of a 629ms render before that. A 560×320, 12-frame
card is roughly 300ms and 250KB, and is cached in KV so a re-ask is a read.

`GET /api/render-card?seed=…` renders a throwaway card on demand, for eyeballing.

---

## Development

```bash
npm install
npm run dev      # wrangler dev, with local KV
npm test         # 44 checks over the generator, content tables, renderer and bot API
npm run deploy   # or just push — CI deploys on every push to the branch
```

Useful routes:

- `/dev` — reroll freely, with each trait labelled by its effect type and layer
- `/reset` — clears your local save and issues a new player id, so you can roll again
- `/api/verify-breeds` — checks every breed slug against the live Dog CEO API
- `/api/leaderboard`, `/api/history?player=…`

### Tests

`npm test` uses node's built-in runner — no extra dependencies. The suite covers the
content tables (every trait specified, unique, parseable colours, populated rarity tiers),
the generator (determinism, score arithmetic, tier labels, retired traits never spawning,
balance, DST handling), and the contract between them: **every effect type the content
references must exist in the engine**, since an unknown type is skipped silently and just
looks like a trait with no visual.

It also renders a card through **every effect in the content tables**, parses the result as
a GIF, and runs the bot API against an in-memory KV — that a second roll never deals a
second dog, that the endpoints are shut without the token, and that junk ids are rejected
before anything is written.

The suite is mutation-checked: a bogus effect type, letting retired traits spawn, and
shifting every trait by one each fail with a specific message.

### Deployment

Pushes to `claude/swampkat-online-game-wuc3kt` run `.github/workflows/deploy.yml`, which
runs the tests, deploys, and syncs `BOT_TOKEN` from the `DOGDLE_BOT_TOKEN` repository
secret. Generate one with `openssl rand -hex 32`; until it is set, `/api/bot/*` answers
`503`. For local work put `BOT_TOKEN=anything` in `.dev.vars`, which is gitignored.

`kv-peek.yml` is a manual, read-only workflow that dumps live leaderboard state — useful
because the Cloudflare API is not reachable from every development environment.

---

## Credits

Photos from the [Dog CEO API](https://dog.ceo/dog-api/). GIF encoding by
[gifenc](https://github.com/mattdesl/gifenc).
