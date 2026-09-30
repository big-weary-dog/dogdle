# How Dogdle works

The deeper notes behind [Dogdle](../README.md): how a dog is put together, why the content
is balanced the way it is, the storage layout, the card renderer, the bot API and the ops
workflows. The README is the friendly tour; this is the *why*. The content counts live
here too.

---

## How a dog is made

Every dog is four independent rolls, combined:

| Part | Source | Notes |
|---|---|---|
| **Breed** | `src/breeds.js` | ~130 breeds, each mapped to a [Dog CEO](https://dog.ceo/dog-api/) slug so a real photo exists. Rarity follows real-world prevalence — Labradors are common, Otterhounds are legendary. Scores 0 / +1 / +2 / +4 / +6 by rarity, with one exception below. |
| **Background** | `src/content/backgrounds.js` | 101 scenes with their own rarity weights, deliberately flatter than the breed table so a boring scene only turns up ~30% of the time. |
| **Name** | `src/content/names.js` | Flat pick from 150. |
| **Traits** | `src/content/traits/` | 501 of them; 4–8 per dog, averaging 6, drawn without replacement. 151 belong to a **group** — see below. |

**Score** = the breed's value + the background's value + every trait's value. The content
is balanced so the average dog scores **0** — see [Balance](#balance).

The roll is deterministic: `hash(playerId + date)` seeds a PRNG, so the same player on the
same day always produces the same dog. That is what lets a share link re-create a dog
without storing anything.

### Rarity vs. quality

These are separate axes and it is worth keeping them straight:

- **Rarity** (Common → Legendary) describes how unusual the *breed* is. It is worth a few
  points — 0 / +1 / +2 / +4 / +6 — and no more than that.
- **Quality** (Should Not Have Happened → Platonic Ideal of Dog) is nine tiers derived
  from the score.

The breed's points are kept small on purpose: a rare breed is a nice start, not a win. A
Common Labrador can still be a Platonic Ideal and a Legendary Xoloitzcuintli can still be
a disaster, because six traits swamp six points. That tension is most of the fun.

Common breeds are a flat zero — they're the baseline a dog is measured against. **One
breed is worth negative points**: the Pit Bull Terrier, at −3. Not a claim about the dog,
a claim about the insurance and the landlord.

### Frogs

About one day in forty (`FROG_CHANCE`, 2.4% measured), the machine doesn't deal a dog: **a
frog has got in**. Frogs are vicious intruders. A frog has no breed, and Dog CEO has no
frogs, so its photo is a real frog of our own: one of 18 openly licensed Wikimedia Commons
photos in `public/frogs/` (`FROG_PHOTOS`), picked from the frog itself and stored on the roll
like a dog's photo URL. It hops. If the photo can't load, it's a big hopping 🐸 instead. It gets a name like Slimy Frog or Loathsome Frog, and 4–6 traits from
its own table of 30 (`src/content/frogs.js`), every one of them negative. It still rolls a
background like a dog, since it's standing somewhere, but being a frog costs −12 on its own.
A frog averages about **−30**, which is nearly always Should Not Have Happened.

Two things keep frogs from disturbing anything else:

- **The frog check has its own hash** (`frog:player:date`), separate from the dog's
  generator. Adding frogs re-dealt no day that stayed a dog; the only golden change was two
  new frog seeds.
- **Frogs sit outside the balance.** The ±0.5 test and `npm run balance` measure dogs only.
  A frog is a tax on top of a balanced dog, so with frogs counted the average roll is
  about −0.75, and that is intended.

`rollDailyDog(player, date, { frog: true })` forces one: `/dev` has a 🐸 button, and
`npm run card -- alice --frog` renders the card.

More frog photos: run the **Fetch frog photo candidates** workflow (`frog-photos.yml`), which
pulls openly licensed frogs from Commons onto a scratch branch, `frog-candidates`, with a
`candidates.json` of credits. Copy the good ones into `public/frogs/` (640px wide, landscape,
under 200KB), add them to `FROG_PHOTOS` with their credit, then run it again with
`clean=true` to delete the branch. New photos only reach future frogs.

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

Backgrounds can also declare **props** — silhouettes in relative coordinates (`rect`,
`ellipse`, `tri`, `hills`, `poly`) drawn behind the dog. Without them every scene was a
sky gradient over a flat band, and 46 different places looked like one place in different
colours. `poly` takes an outline, `points: [[x, y], ...]`, and exists because the other four
can't lean: the listing cruise ship never listed until it could.

**The dog covers the middle** — roughly x 0.2–0.8, y 0.15–0.77 — so a scene is seen at its
edges, along the top, and on the ground in front. The backgrounds that work all frame the
dog: curtains at both sides, trees at the corners, an eclipse in the top corner. One big
prop in the centre is simply never seen.

To look at them, render a contact sheet through the real pipeline rather than trusting the
data: `npm run sheet -- out.png beach,volcano`. Three bugs in the shared effects were invisible until someone did, all of them in
the web page as well as the cards:

- **Rain fell as scattered ticks.** Every falling particle got a random rotation, which is
  right for a leaf and wrong for rain. Line particles now point along their fall.
- **Snow fell in rows.** A particle leaving the bottom reset to a fixed line at the top, so
  at the GIF's 120ms step everything that wrapped in the same frame landed on the same row.
  Particles now wrap by their overshoot and stay desynchronised.
- **Fog had hard edges.** Each puff was a circular gradient filled into an ellipse half as
  tall, which cut the fade off while it was still half opaque. Puffs are now soft circles.

Trait emoji appear in a fixed rail down the right edge of the stage. They used to orbit
the dog, which read as scattered clip art; a fixed rail reads as designed.

### Adding a trait

Append to the right category file in `src/content/traits/`:

```js
{ text: "Has a nemesis", emoji: "😾", value: -2, category: "circumstance",
  effect: { type: "vignette", layer: "front", params: { color: "#1c1917", opacity: 0.5 } } },
```

`effect` may be `null` — the emoji badge still shows. Then run `npm test`, which will tell
you if the effect type doesn't exist or the layer is wrong, and whether the balance moved.

**Never delete a trait.** Mark it `obsolete: true` instead. Stored dogs still reference
their traits by value, so a deleted one would break every dog already carrying it. An
obsolete trait stays resolvable but never spawns again.

### Groups

Some traits sit on the same axis, and stacking them reads as a bug. A dog is one shape; it
smells of one thing. A trait carrying a `group` blocks every other trait in that group:

```js
{ text: "Starved", emoji: "🍽️", value: -5, category: "condition", group: "build", ... },
```

Twenty-four groups, 151 traits: `build` (14), `fame` (11), `job` (11), `voice` (11),
`pedigree` (10), `loyalty` (8), `mind` (7), `smell` (7), `money` (6), `nose` (6), `tail` (6),
`age` (5), `coat` (5), `fetch` (5), `homes` (5), `speed` (5), `weather` (5), `camera` (4),
`car` (4), `diet` (4), `training` (4), `omen` (3), `sleep` (3), `cats` (2). A blocked trait
is dropped rather than retried, so the dog still gets its full four to eight — the pool is
377 deep and six are drawn.

The bar for a group is that its members are **inherently exclusive** — not merely on a
theme. A dog holds one rank in `fetch`, has one `job`, is one shape. Traits that merely
rhyme stay ungrouped: being under investigation and being named in a lawsuit are both
perfectly possible, so there is no `legal` group. And "Ate a bee" / "Ate a bee. Again."
must never be grouped, because stacking them is the joke.

`group` is orthogonal to `category`: the category decides which file a trait lives in, the
group decides what it excludes. A group of one excludes nothing, and `npm test` fails on
one.

---

## Balance

The average dog scores 0 by construction, not by moving the goalposts.

Two of the three parts pull upward: a rarity-weighted breed mean of **+0.92** and a
background mean of **+0.88**. With six traits per dog, the trait pool has to average
about **−0.30** for the whole thing to centre on zero.

The background mean was +1.04 until the 14 added in the background pass. Their values were
set by what each place deserves, not by what the mean needed — a Timeshare Presentation is
worse than Hell and says so — and the traits absorbed the difference. That is the intended
division of labour: backgrounds are the lopsided jackpots, traits are the balancer. The 28
added after that (Pripyat to Atlantis, then the Good Timeline) were split evenly enough
between good and bad places that they moved the mean only from +0.84 to +0.89, and needed
no correction. Neither did the 13 from the past and the far future (the Colosseum to the
Heat Death of the Universe), which nudged it back to +0.88.

**Groups move the mean**, which is easy to miss, and not always upward. The first six
were largely negative, so excluding their duplicates removed the worst stacks and pushed
the mean from +0.004 to +0.280 before a single new trait counted. The second batch leaned
the other way — `job` alone capped a dog that could previously hold Supreme Court Justice,
Megacorporation CEO, Dogdle developer and Practicing therapist at once for +23 — so the
correction that round was *upward*. Either way the fix is the same rule, applied in
whichever direction: one point at a time, across distinct ungrouped traits.

That `job` cap is deliberate. A dog with four careers is noise rather than a jackpot, and
the Platonic Ideal tier is meant to be hard.

When a change pushes it off, the correction is spread **one point at a time across
distinct traits** in the −4…−2 band, across all five categories. Concentrating it on the
harshest traits — which a greedy pass does by default — flattens the tail and takes the
drama out of an extreme roll.

Breeds and backgrounds are deliberately left lopsided (Heaven +12, Hell −7). They are the
jackpots.

Measured over 20k rolls: mean **−0.013**, median 0, tiers landing at roughly
0.3 / 3.9 / 12.9 / 22.1 / **21.5** / 22.3 / 12.8 / 3.8 / 0.3.

### The correction band is running dry

Every rebalance so far has moved ungrouped traits in the −4…−2 band by a point, spread so
no trait takes two. The fourth trait batch (+0.71 before correction) was the first to
touch traits for a second time: 29 of them, a point each, new and old alike.

The fifth (+0.80) would have hit most of those same traits again, so it was split instead:
22 positives in the +3…+5 band down a point, and 13 negatives the previous round hadn't
touched. Taking every correction from the negatives makes the bad end harsher batch after
batch; `npm run balance` now lists both bands for exactly that reason. Concentrating
a correction is what flattens the tails.

The sixth (64 traits, +1.04) needed 57 points, more than the untouched traits could give.
It took all 30 untouched ones, then 27 that had been moved once — never one moved twice —
alternating positives and negatives, with negatives kept inside −4…−2.

**Every batch so far has come in positive** (+0.71, +0.80, +1.04). New traits are
written generously; the pool needs them to average about −0.3. Aim a batch's values at
roughly `−0.3 × its size` and the correction shrinks to almost nothing. The seventh (30
deep-cut references, summing to −9) was aimed that way and needed no correction at all.

### The outer tiers are compressing

Worth watching rather than fixing yet. Every group narrows the extremes, because an
extreme score needs a stack of same-direction traits and groups are exactly what stop one.
Platonic Ideal has gone 0.8% → 0.9% → 0.6% → 0.5% → 0.4% → 0.4% → 0.3% across the last six content passes,
with Should Not Have Happened tracking it down on the other side.

Both ends are moving together, so the ladder is still symmetric — it is getting *narrower*,
not lopsided. If it ever needs correcting, the lever is the thresholds, not the groups:
against the current distribution, `±24` would have to become **+23 / −22** to put about
0.8% back in each outer tier. Changing a threshold re-labels dogs that are already stored,
so it is a deliberate act rather than a tuning knob.

`npm test` fails if the mean drifts past ±0.5.

---

## Architecture

A single Cloudflare Worker serves both the API and the static assets.

```
src/
  worker.js    routes: roll, leaderboard, history, card upload/serve, image proxy, share page,
               kennel pages
  bot.js       the Discord bot API (/api/bot/*)
  kennel.js    a player's collection and its album image
  mega.js      the mega-kennel: every dog ever, from the board index
  accounts.js  web accounts: username + emoji PIN, and linking one to Discord
  meld.js      folding anonymous web players into Discord players, by hand (meld.yml)
  roll.js      the deterministic generator and the Eastern day boundary
  content/     the content tables, one file per kind:
                 names.js, backgrounds.js, tiers.js, traits/<category>.js
  breeds.js    breed table, rarity weights and what a rarity is worth
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
  account.js   the sign-up / sign-in / sync-with-Discord screens and the account bar
  pin-emoji.js the PIN keypad, shared with the Worker
  dev.js/html  /dev — unlimited rerolls for playtesting
  kennel.html  /kennel/<player> — a player's album (Discord id or username), every dog
  mega.html    /kennels — the mega-kennel, every dog anyone has ever rolled
  kennel.css   styles shared by both
  effects.js   the canvas renderer: effect types, layers, props, subject CSS
  vendor/      gifenc, vendored (see package.json devDependencies for the source)
scripts/
  build-atlas.mjs   bakes the glyph/emoji atlas with a headless browser  (npm run atlas)
  bake-golden.mjs   re-records the content and generator snapshots       (npm run bake)
  balance.mjs       balance report and correction candidates              (npm run balance)
  sheet.mjs         contact sheet of backgrounds                          (npm run sheet)
  card.mjs          renders Discord cards offline                         (npm run card)
  kennel.mjs        renders kennel albums offline                         (npm run kennel)
test/          node:test suites — content, roll, effects, card, bot, inventory, golden
```

### Storage

One KV namespace, separated by key prefix:

| Key | Holds |
|---|---|
| `roll:<player>:<date>` | The full dog, written once and replayed forever after |
| `day:<date>:<player>` | Leaderboard entry — summary lives in **list metadata**, so the board is one `list` call and never fetches values |
| `guild:<guild>:<date>:<player>` | The same row, scoped to one Discord server |
| `card:<player>:<date>` | The rendered share GIF, 30-day TTL |
| `kennel:<player>:<stamp>` | A rendered kennel album, 7-day TTL |
| `user:<username>` | A web account: its handle, private player id, hashed PIN, linked Discord id |
| `owner:<player>` | Private id → username (also in list metadata, for the mega-kennel) |
| `discordlink:<snowflake>` | Which account a Discord player is linked to |
| `linkcode:<CODE>` | A "Sync with Discord" code, 10-minute TTL |
| `pinfail:<username>` | Failed PIN count, 15-minute TTL |

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

**Base URL: `https://dogdle.swampkat.com`.**

That took a Cloudflare change. With Bot Fight Mode on, the zone answered *every* request
from a server with `403` and `cf-mitigated: challenge` — plain curl, a browser
`User-Agent` and a full set of browser headers alike, so it was the connection being
scored and no bot could satisfy it. It is now off (Cloudflare → swampkat.com → Security →
Bots). If it ever comes back on, the Worker is also reachable at its `workers.dev`
hostname, which the zone's WAF isn't in front of; card URLs follow automatically either
way, since the API builds them from the origin the request arrived on.

**The bot spec lives in [`docs/discord-bot-prompt.md`](discord-bot-prompt.md)** —
hand that to whoever is writing the bot.

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
| `GET /api/bot/kennel?discordId=` | Their collection — breeds, places, traits and tiers found out of everything there is — and an album image. |
| `GET /api/bot/best?discordId=` | Their six best dogs and three worst, frogs excluded, each with its card. |

Roll, dog and kennel replies also carry a link to the player's album page on the website.

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

### The kennel

`/api/bot/kennel` is a player's collection: the breeds, places and traits their dogs have
turned up and the tiers they've landed in, each out of everything that can still turn up
(obsolete traits don't count, or no album could ever be finished). `src/kennel.js` counts
it and draws it — a still album with a grid of every place in the game, lit where the
player has been, sorted common to legendary so the gaps that matter sit at the end, and a
year of squares along the bottom, one a day, coloured by how good that day's dog was
(frogs are green). Best and worst dog skip frogs: a frog is a bad day by design.

It's built from the stored rolls every time, one read per dog, rather than kept up to date
on each roll: there is nothing to migrate and nothing to drift. The album is stored under a
**stamp** — the newest roll's date and the number of rolls — so its URL changes the moment
a dog is added and Discord's image cache never shows an old one. `/k/<player>/<stamp>.gif`
redraws a missing album like `/i/` redraws a missing card, but only for the current stamp,
which the roll list settles before a single roll is read.

The same collection is public on the website at `/kennel/discord-<id>`: the counts, the
calendar (click a day to jump to its dog) and every card the player has rolled, sortable
by date or score. It reads
`/api/kennel?player=`, which needs no token — nothing in a kennel is private — and only
answers for Discord players, since a web player's id is their secret roll key. The page's
head is filled in by the Worker (one list, one read), so its link unfurls in Discord as
"<name>'s Kennel" with the album image: posting the link alone is a whole kennel reply.

A kennel also has a **total** (every dog's score added up) and an **average dog**, both
leaving frogs out.

### The mega-kennel

`/kennels` is every dog anyone has ever rolled, web and Discord together: the best and
worst dogs ever, the all-time average, every player's kennel, and a searchable wall of
every dog. `/api/kennels` builds it from the global board index (`day:<date>:<player>`)
alone — list calls and metadata, never a value read — and the answer sits in the edge
cache for a minute, shared by the page and the API. Test rolls are left out, and frogs
are listed but kept out of the numbers.

It's public, so it follows the leaderboard's rule: a web player's id never leaves the
server. An anonymous web player's dogs are listed by name only. A Discord dog links to
its card and its player's kennel, which the Discord embeds already show publicly, and an
account holder's dog links to its `/u/<username>/` card and `/kennel/<username>`.

### Accounts

A web player's id is a random UUID in `localStorage`, and it is the only key to their
dogs: lose the browser, lose the dogs. An **account** puts a public username in front of
that private id. `src/accounts.js` holds it; `public/account.js` is the UI.

- **Claiming.** A browser with no account is asked once a day ("Not now" snoozes it), and
  again whenever it pulls the lever, to pick a username and an emoji PIN (3–6 taps on a 3×3 pad of nine). Its existing dogs stay
  where they are; the account just points at them.
- **Signing in.** A browser with no id at all asks "new here, or played before?" A
  username and PIN hand the private id back, so a second device gets the same dog. PINs
  are PBKDF2-hashed; five misses lock the username for 15 minutes.
- **Public by username.** The username is public; the private id never is. An account's
  kennel is `/kennel/<username>`, its cards `/u/<username>/<date>.gif`, and its share
  text uses those.
- **Sync with Discord.** The account bar's button makes a 10-minute code; the player sends
  `/dogdle link <code>` in Discord, and the bot calls `POST /api/bot/link`. From then on
  the website rolls as `discord-<id>`, so web and bot deal the same dog. Web dogs move to
  the Discord player on every day Discord hadn't rolled (as they were — never re-dealt);
  on a day both rolled, the Discord dog wins and the web one stays stored but off the board.

There's no PIN reset yet: a forgotten PIN means deleting `user:<name>` by hand.

**Melding** (`src/meld.js`, run from `meld.yml`) is the same move done by hand for players
who rolled on the web anonymously before accounts existed. A plan lists every anonymous
web player by name beside the Discord names that sound closest; the pairs you approve
move over (never onto a day Discord already has a dog for), and those browsers roll as
the Discord player from then on. With a date, one historic dog changes hands instead;
with `web:<name>`, one person's two browsers fold into one web player and its name.

### Test rolls

`POST /api/bot/roll` with `"test": true` deals a real dog and renders a real card, it just
doesn't count: the row is hidden from every leaderboard (pass `includeTest=1` to see it)
and everything it writes carries a 48-hour TTL, so smoke-testing the live Worker leaves
nothing behind for anyone to go and delete.

`bot-smoke.yml` is a manual workflow that does exactly that against production from a
GitHub runner — three mock users (`9000000000000000 01/02/03` in guild `…009`), a
replay check, the boards with and without test rows, auth rejections, and the rendered
GIFs uploaded as an artifact.

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

`npm run card -- alice 2026-09-22` renders one offline, for eyeballing.

---

## Development

**Agents (and people) working on this repo: read [`CLAUDE.md`](../CLAUDE.md) first.** It has
the hard rules, the checklist after a content change, and how to split work across
parallel branches without conflicts.

```bash
npm install
npm run dev      # wrangler dev, with local KV
npm test         # the whole suite: generator, content tables, renderer and bot API
npm run balance  # where the average dog sits, and what to nudge if it drifted
npm run deploy   # or just push — CI deploys on every push to the branch
```

Cloud sessions install dependencies automatically via `.claude/hooks/session-start.sh`.

Useful routes:

- `/dev` — reroll freely, with each trait labelled by its effect type and layer
- `/reset` — clears your local save and issues a new player id, so you can roll again
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

Pull requests run the suite via `test.yml`. Deploys queue rather than overlap, so merges
landing close together can't roll the site back.

Some things can only be checked from outside, because the Cloudflare API and Dog CEO are
not reachable from every development environment. Each is a workflow:

| Workflow | Does |
|---|---|
| `bot-smoke.yml` | Manual. Exercises the live bot API with test users (see [Test rolls](#test-rolls)). |
| `card-audit.yml` | Manual, read-only. Checks recent Discord cards the way Discord fetches them, re-renders each from its stored dog, and reports the Worker's error counts. |
| `kv-peek.yml` | Manual, read-only. Dumps live leaderboard state. |
| `photo-audit.yml` | Manual. Finds stored rolls with no photo; `repair: true` re-requests them. |
| `verify-breeds.yml` | Weekly. Checks every breed slug against the live Dog CEO API. |

### Logs

Workers Logs is on (`[observability]` in `wrangler.toml`): open the Worker in the
Cloudflare dashboard, then **Logs**. Every line is a JSON object from `src/log.js`, so
filter on `event`. Handled failures log at `warn` -- a photo that didn't load
(`photo.lookup_failed`, `photo.bytes_failed`, `photo.decode_failed`), a card drawn late
(`card.rendered_on_read`) or not found (`card.missing`, with the `colo` that missed) -- and
anything unhandled at `error` as `request.failed`. That request's 500 carries its `ray`
id, which matches the log line. Each Discord roll leaves one `bot.roll` line saying
whether its card was `rendered`, `cached` or `failed`.

---

## Credits

Photos from the [Dog CEO API](https://dog.ceo/dog-api/). GIF encoding by
[gifenc](https://github.com/mattdesl/gifenc).

Frog photos from Wikimedia Commons, resized: [american-toad](https://commons.wikimedia.org/wiki/File:Bufo_americanus_PJC1.jpg) by Cephas (CC BY-SA 3.0), [blue-poison-dart-frog](https://commons.wikimedia.org/wiki/File:Dendrobates_azureus_(Dendrobates_tinctorius)_Edit.jpg) by Michael Gäbler (CC BY 3.0), [burrowing-frog-grumpy](https://commons.wikimedia.org/wiki/File:Glyphoglossus_molossus,_Blunt-headed_burrowing_frog_-_Hua_Hin_District,_Near_Pala-U.jpg) by Rushenb (CC BY-SA 2.0), [burrowing-frog-leaves](https://commons.wikimedia.org/wiki/File:Glyphoglossus_molossus,_Blunt-headed_burrowing_frog_-_Mueang_Loei_District,_Loei_Province_(47097003944).jpg) by Rushen (CC BY-SA 2.0), [cane-toad](https://commons.wikimedia.org/wiki/File:Bufo_marinus_in_Venezuela.jpg) by Wilfredor (CC0), [common-toad](https://commons.wikimedia.org/wiki/File:Bufo_bufo_on_grass2.JPG) by Korall (CC BY-SA 3.0), [dyeing-poison-frog](https://commons.wikimedia.org/wiki/File:Dendrobates_tinctorius_-_Karlsruhe_Zoo_05.jpg) by H. Zell (CC BY-SA 3.0), [edible-frog-lily-pad](https://commons.wikimedia.org/wiki/File:Rana_esculenta_on_Nymphaea_edit.JPG) by Grand-Duc, Niabot (edit) (CC BY 3.0), [golden-mantella](https://commons.wikimedia.org/wiki/File:Variegated_golden_frog_(Mantella_baroni)_Ranomafana.jpg) by Charles J. Sharp (CC BY-SA 4.0), [marsh-frog-warty](https://commons.wikimedia.org/wiki/File:2017.06.11.-03-Anglerteiche-Rimbach--Seefrosch.jpg) by Andreas Eichler (CC BY-SA 4.0), [marsh-frog](https://commons.wikimedia.org/wiki/File:Marsh_frog_(Pelophylax_ridibundus).jpg) by Charles J. Sharp (CC BY-SA 4.0), [peeking-tree-frog](https://commons.wikimedia.org/wiki/File:Aplastodiscus_arildae_no_Parque_Estadual_de_Caparao_por_Lucas_Rosado_(03).jpg) by Lucas Rosado Mendonça (CC BY-SA 4.0), [red-eyed-tree-frog-night](https://commons.wikimedia.org/wiki/File:Red-eyed_Tree_Frog_-_Litoria_chloris_edit1.jpg) by LiquidGhoul edited by Muhammad (CC BY-SA 3.0), [red-eyed-tree-frog](https://commons.wikimedia.org/wiki/File:Red_eyed_tree_frog_edit2.jpg) by Careyjamesbalboa (Carey James Balboa) (Public domain), [strawberry-poison-frog](https://commons.wikimedia.org/wiki/File:Strawberry_poison_dart_frog_(70539).jpg) by Rhododendrites (CC BY-SA 4.0), [water-frog-eye](https://commons.wikimedia.org/wiki/File:Waterfrog_head.jpg) by Holger Gröschl (CC BY-SA 2.0 de), [white-lipped-tree-frog-leaf](https://commons.wikimedia.org/wiki/File:White-lipped_tree_frog_(Nyctimystes_infrafrenatus)_Daintree.jpg) by Charles J. Sharp (CC BY-SA 4.0), [white-lipped-tree-frog](https://commons.wikimedia.org/wiki/File:Litoria_infrafrenata_-_Julatten.jpg) by JJ Harrison (https://www.jjharrison.com.au/) (CC BY-SA 3.0).
