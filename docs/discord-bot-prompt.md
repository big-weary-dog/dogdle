# Dogdle Discord bot — build spec

Hand this whole file to whoever (or whatever) is writing the bot.

---

## What you're building

Dogdle gives every player one dog a day. The dog has a breed, a real photo, a place it's
standing, and a handful of traits that are each an asset or a liability; they add up to a
score, and the score lands it in one of nine quality tiers. **One roll per person per day,
no rerolls** — the day rolls over at midnight US Eastern.

The bot does these things:

1. **`/dogdle`** — rolls the caller's dog and posts it.
2. **A daily digest** — one message summarising everyone's dogs, modelled on the Wordle
   bot's morning post: a compact leaderboard, then a card per player, then a button.
3. **`/dogdle kennel`** — the caller's collection: every breed, place and trait their
   dogs have turned up, and a year of days coloured by how good each dog was, as one image.
4. **`/dogdle best`** — the caller's hall of fame: their best dogs and their worst.
5. **`/dogdle day <date>`** — the dog the caller got on a given day.
6. **`/dogdle link <code>`** — ties the caller to their account on the website.

Every one of these can link to the player's **album page** on the website, which shows
every dog they've ever rolled.

The server renders the card image, including a sidebar listing every trait with its emoji
and point value. **The image carries the detail; the text stays short.**

---

## The API

Base URL: `https://dogdle.swampkat.com`
Every request needs `Authorization: Bearer $DOGDLE_BOT_TOKEN`. Without it you get `401`;
if the server has no token configured you get `503`. Ask Zach for the token.

Discord users are their own players — rolling here does not consume anyone's roll on the
website, and vice versa.

### `POST /api/bot/roll`

```json
{ "discordId": "185432...", "guildId": "998877...", "displayName": "Felfox" }
```

`guildId` and `displayName` are optional. **Idempotent**: calling it twice in a day returns
the same dog with `"replayed": true`, so it is safe to retry, and safe to call when you
aren't sure whether someone has rolled.

```json
{
  "name": "Steve",
  "breed": "Coonhound",
  "rarity": "Rare",
  "rarityColor": "#60a5fa",
  "score": 16,
  "quality": "Exceptional Animal",
  "qualityColor": "#22d3ee",
  "qualityEmoji": "🌟",
  "date": "2026-09-22",
  "background": { "name": "A Mountain Summit", "emoji": "🏔️", "value": 5 },
  "traits": [
    { "text": "Bit a groomer once", "emoji": "🩹", "value": -3 },
    { "text": "Dogdle developer", "emoji": "👨‍💻", "value": 5 },
    { "text": "Local celebrity", "emoji": "👑", "value": 6 },
    { "text": "Gambling addiction", "emoji": "🎰", "value": -3 }
  ],
  "image": "https://dogdle.swampkat.com/i/discord-185432.../2026-09-22.gif",
  "link": "https://dogdle.swampkat.com/",
  "kennel": "https://dogdle.swampkat.com/kennel/discord-185432...",
  "text": "Steve the Coonhound — Exceptional Animal (+16)",
  "replayed": false
}
```

`image` is a plain animated GIF, 560×320, ~250–480KB. Put it straight in an embed.
`kennel` is the player's album page on the website: every dog they've rolled.

About one day in forty, a player's roll isn't a dog: **a frog has got in**. The payload
then carries `"frog": true`, `breed` is `"Intruder"`, `rarity` is `"Not a Dog"`, and the
name is something like `"Slimy Frog"`. The score is usually around −30, and the card shows
a real frog photo, hopping, where the dog would be. The shape is otherwise identical, so nothing breaks if
you ignore the flag, but a frog deserves a reaction (🐸, or a line of sympathy).

About one pull in twenty, the dog is a **puppy** of the player's last dog and someone
else's dog from yesterday's board. The payload then carries a `puppy` object, and each
trait it inherited carries `from`, the parent's name:

```json
"puppy": {
  "parents": [
    { "name": "Ebony", "breed": "Belgian Malinois", "owner": "Felfox",
      "kennel": "https://dogdle.swampkat.com/kennel/discord-185432..." },
    { "name": "Zizou", "breed": "English Bulldog", "owner": "Sam", "kennel": null }
  ]
},
"traits": [{ "text": "Unwashed", "emoji": "🧼", "value": -3, "from": "Ebony" }, ...]
```

`kennel` is null when that parent's owner has no public kennel. Worth a 🍼 and a shout
to the other parent's owner. Board rows for a puppy carry `"puppy": true`.

### `GET /api/bot/dog?discordId=…&date=…`

The same payload **without dealing a dog**. Returns `{ "pending": true, "date": "…" }` if
they haven't rolled. Use it for "you already rolled today", for filling in the digest, and
for `/dogdle day`.

### `GET /api/bot/leaderboard?guildId=…&date=…`

Both params optional — no `guildId` gives the global board across every server and the
website. Rows come back **already sorted by score, highest first**.

```json
{
  "date": "2026-09-22",
  "guildId": "998877...",
  "rows": [
    { "player": "doggo", "dog": "Sasha", "breed": "Boxer", "score": 28,
      "quality": "Platonic Ideal of Dog", "qualityEmoji": "👑", "emoji": "🦁",
      "discordId": "1854...", "image": "https://dogdle.swampkat.com/i/discord-1854.../2026-09-22.gif" }
  ]
}
```

`emoji` is the background's; `qualityEmoji` is the tier's. Rows from website players have
no `discordId` and no `image` — skip those when building per-player cards.

### `GET /api/bot/history?discordId=…`

Every dog that player has been dealt, newest first.

### `GET /api/bot/kennel?discordId=…`

The player's collection, counted against everything that can turn up. Read-only — it
never deals a dog. A player with no dogs yet gets `{ "empty": true, "days": 0 }`.

```json
{
  "name": "Felfox", "days": 40, "frogs": 2,
  "total": -23, "average": -0.6,
  "averageQuality": { "label": "Perfectly Average", "emoji": "😐", "color": "#facc15" },
  "breeds":      { "found": 32,  "total": 131 },
  "backgrounds": { "found": 30,  "total": 101 },
  "traits":      { "found": 168, "total": 377 },
  "tiers":       { "found": 8,   "total": 9 },
  "best":  { "name": "Marmalade", "breed": "Coton de Tulear", "score": 17, "date": "2026-08-26",
             "quality": "Exceptional Animal", "qualityEmoji": "🌟" },
  "worst": { "name": "Pesto", "breed": "Chihuahua", "score": -27, "date": "2026-08-24",
             "quality": "Should Not Have Happened", "qualityEmoji": "💀" },
  "rarest": [{ "kind": "background", "name": "Deep Space", "emoji": "🪐",
               "rarity": "legendary", "rarityLabel": "Legendary", "rarityColor": "#fbbf24" }],
  "image": "https://dogdle.swampkat.com/k/discord-1234.../2026-09-29-40.gif",
  "link":  "https://dogdle.swampkat.com/kennel/discord-1234...",
  "text": "40 dogs · total -23 · average -0.6 · 32/131 breeds · 30/101 places · 168/377 traits"
}
```

`image` is a still 560×420 album: the counts and highlights on the left, a grid of every
place in the game on the right, lit where the player has been, and along the bottom a year
of squares, one a day, coloured by that day's quality tier (frogs are green). `best` and
`worst` never count frogs, and neither do `total` (every dog's score added up) and
`average` (the average dog, to one decimal; `null` with no dogs). `link` is the album
page on the website. Its URL changes whenever a
dog is added, so Discord never shows a stale one — always use the `image` from the latest
call rather than keeping one.

### `GET /api/bot/best?discordId=…`

The player's hall of fame, read-only. Frogs are left out of both lists: a frog is a bad
day by design and would crowd out the real disasters.

```json
{
  "best":  [{ "name": "Marmalade", "breed": "Coton de Tulear", "score": 17, "date": "2026-08-26",
              "quality": "Exceptional Animal", "qualityEmoji": "🌟",
              "image": "https://dogdle.swampkat.com/i/discord-1234.../2026-08-26.gif" }],
  "worst": [{ "name": "Pesto", "…": "…" }],
  "link":  "https://dogdle.swampkat.com/kennel/discord-1234..."
}
```

`best` is up to six dogs, highest first; `worst` is up to three, lowest first, and never
repeats a dog from `best` (a player with seven dogs has one worst). A player with no dogs
gets `{ "empty": true, "best": [], "worst": [] }`.

### `POST /api/bot/link`

```json
{ "discordId": "185432...", "code": "K7QX2M" }
```

A website player presses **"Sync with Discord"** and gets a six-character code (letters
and digits, no 0/O/1/I; case doesn't matter; good for ten minutes, once). This ties their
website account to the caller: from now on both deal the same dog, and their website
dogs join the caller's kennel.

```json
{ "username": "molossus", "handle": "Molossus", "moved": 12, "kept": 1,
  "kennel": "https://dogdle.swampkat.com/kennel/discord-185432...",
  "text": "Linked to Molossus on the website. 12 dogs joined your kennel." }
```

Errors: `400` bad code format, `404` unknown or expired code, `409` already linked (either
side). Each has an `error` string safe to show.

---

## Message 1 — `/dogdle`

Reply with **one embed**: the player as the author (name + avatar), the card as the image,
a one-line title. The traits are already in the image; do not repeat them as text.

```
┌────────────────────────────────────┐
│ 🖼️ Felfox                          │   ← embed author + their avatar
│ 🌟 Steve the Coonhound             │   ← title: qualityEmoji + text
│ Exceptional Animal · +16 · Rare    │   ← one line of detail
│ ┌────────────────────────────────┐ │
│ │  [ the 560×320 animated card ] │ │   ← embed image = `image`
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

- Set the embed colour to `qualityColor` so a great dog and a disaster read differently
  at a glance.
- If `replayed` is `true`, make it ephemeral and say "you already rolled today — here's
  your dog again." Never imply they can roll again.
- Add a link button, **"Kennel"**, pointing at `kennel`.

## Message 2 — the daily digest

Post it each morning for **yesterday**. Structure, in one message:

1. **A header line**, then the leaderboard grouped by quality tier.
2. **One embed per player** — author = display name + avatar, image = their card.
3. **A link button, "Roll now!"**, pointing at `https://dogdle.swampkat.com/`.

Rows arrive sorted by score, and tiers are monotonic in score, so you can group
**consecutive rows with the same `quality`** — no tier table to hardcode, and empty tiers
never appear.

```
🐕 Dogdle · Monday, September 22 — 6 dogs walked

👑 Platonic Ideal of Dog   @doggo +28
🌟 Exceptional Animal      @Kwalli +16
🙂 Above Average           @uiui +7 · @Ferni +7
😐 Perfectly Average       @Moogle +1
😬 Rough                   @Inferni −11

  ┌──────────────────────┐  ┌──────────────────────┐
  │ doggo                │  │ Kwalli               │   ← six embeds, in
  │ [ Sasha's card gif ] │  │ [ Kiwi's card gif ]  │     leaderboard order
  └──────────────────────┘  └──────────────────────┘
                        … and so on …

               [ Roll now! ]
```

Keep the text to the tier lines. Everything about a specific dog — breed, background,
traits, point values — is already drawn in its card, and repeating it makes the post a
wall.

Worth adding, both one line:

- A **Dog of the Day** callout for the top score.
- A **wooden spoon** for the bottom one, if it's negative. The game is cynical; lean in.

## Message 3 — `/dogdle kennel`

**The simplest version is just the link.** `https://dogdle.swampkat.com/kennel/discord-<id>`
unfurls in Discord as "{name}'s Kennel" with the album image, no token needed. Add
`?d=<today, US Eastern>` so Discord's link cache shows today's album, not yesterday's.

The richer version:

Reply with **one embed**, shaped like Message 1: the player as the author, `image` as the
image, `text` as the one line of detail. Title it `🐾 {name}'s Kennel`, falling back to the
Discord display name when `name` is empty.

- It's the caller's own kennel. An optional `user` option can show someone else's — it's
  the same call with their id, and nothing on it is private.
- `empty: true` → an ephemeral "no dogs yet — `/dogdle` to get your first."
- Don't list the counts as fields; they're in the image. One line under it is plenty.
- Add a link button, **"See every dog"**, pointing at `link`.

## Message 4 — `/dogdle best`

One message: a title line (`🏆 {name}'s best dogs`), then **one embed per dog**, the best
first and then the worst, each with the card `image` and a one-line title like
`🌟 Marmalade the Coton de Tulear +17 · Aug 26`. That's at most nine embeds. Put a
`Worst` divider in the title of the first worst embed (`💀 Worst: Pesto …`) so the turn
reads. End with a **"See every dog"** button pointing at `link`. Same `user` option and
`empty` handling as the kennel.

## Message 5 — `/dogdle day <date>`

`date` is `YYYY-MM-DD` (accept "yesterday" too, computed in US Eastern). Call
`GET /api/bot/dog` and reply exactly like Message 1, minus the "already rolled" wording.
`pending: true` → an ephemeral "no dog that day." Never roll for a missed day: the past
is closed.

## Message 6 — `/dogdle link <code>`

A required string option `code`. Call `POST /api/bot/link` and reply **ephemerally**
with `text` and a **"Kennel"** link button to `kennel`. On an error, reply ephemerally
with the `error` string. Don't post anything public: it's account plumbing.

---

## Rules

- **Discord allows at most 10 embeds per message.** With more than 9 players, show the
  top 9 cards and add a line like `+4 more at dogdle.swampkat.com`. Do not split into
  several messages — the digest is one post.
- **Dates are US Eastern**, not UTC and not the server's local zone. "Yesterday" for a
  digest posted at 8am ET is `today_in_ET - 1 day`. Compute it with a real timezone
  library, not a fixed offset — it has to survive daylight saving.
- **Never call `/api/bot/roll` on someone's behalf during the digest.** Rolling is the
  player's own action; the digest reports what people already rolled. Use
  `/api/bot/leaderboard` (and `/api/bot/dog` if you need one player's detail).
- **A player who didn't roll simply isn't on the board.** Don't render a placeholder for
  them, and don't @mention people to nag them.
- `POST /api/bot/roll` takes roughly 0.4–1.5s the first time (it renders the GIF) and is
  fast afterwards. Defer the interaction reply.
- Retries are safe everywhere: the roll is idempotent and everything else is a read.
- A `500` comes back as `{ "error": "internal error", "ray": "…" }`. Log the `ray`: it is
  the key to the matching line in the server's logs.
- Never log or echo the bearer token.
- `"test": true` on a roll makes it a real dog that doesn't count — hidden from every
  leaderboard, expires in 48 hours. Use it while developing so you don't pollute the
  board; leave it off in production.

## Tone

Plain and a bit cynical, never announcer-voice. The traits are things like "Has malaria",
"Ate a child", "Doesn't return the shopping cart" — stated flatly, which is the joke. The
bot should sound like it is reading out results, not hyping them.
