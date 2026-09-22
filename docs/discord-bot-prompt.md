# Dogdle Discord bot — build spec

Hand this whole file to whoever (or whatever) is writing the bot.

---

## What you're building

Dogdle gives every player one dog a day. The dog has a breed, a real photo, a place it's
standing, and a handful of traits that are each an asset or a liability; they add up to a
score, and the score lands it in one of nine quality tiers. **One roll per person per day,
no rerolls** — the day rolls over at midnight US Eastern.

The bot does two things:

1. **`/dogdle`** — rolls the caller's dog and posts it.
2. **A daily digest** — one message summarising everyone's dogs, modelled on the Wordle
   bot's morning post: a compact leaderboard, then a card per player, then a button.

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
  "text": "Steve the Coonhound — Exceptional Animal (+16)",
  "replayed": false
}
```

`image` is a plain animated GIF, 560×320, ~250–480KB. Put it straight in an embed.

### `GET /api/bot/dog?discordId=…&date=…`

The same payload **without dealing a dog**. Returns `{ "pending": true, "date": "…" }` if
they haven't rolled. Use it for "you already rolled today" and for filling in the digest.

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
- Never log or echo the bearer token.
- `"test": true` on a roll makes it a real dog that doesn't count — hidden from every
  leaderboard, expires in 48 hours. Use it while developing so you don't pollute the
  board; leave it off in production.

## Tone

Plain and a bit cynical, never announcer-voice. The traits are things like "Has malaria",
"Ate a child", "Doesn't return the shopping cart" — stated flatly, which is the joke. The
bot should sound like it is reading out results, not hyping them.
