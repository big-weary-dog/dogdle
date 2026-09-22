# Suggested improvements

Nothing here is built. It's a menu, roughly ordered by how much fun it buys per unit of
work, with the honest cost and the honest risk next to each.

Read it with one question in mind: **Dogdle's whole appeal is that it takes eleven seconds
a day.** Several of the best-sounding ideas below quietly turn it into a game you have to
keep up with, and that is how these things die.

---

## 1. Cheap, and probably worth doing

### Streaks
The Wordle bot's "58 day streak 🔥" is doing a lot of work in that screenshot. You already
store every roll, so a streak is a read over `roll:<player>:*` — no new writes, no new
state. Shows up on the page and in the digest.

*Risk:* streaks are the single most reliable way to turn a toy into an obligation. A
**group** streak (the server rolled at least once) carries the warmth without making any
one person responsible for it. That's what the Wordle bot actually does.

### A weekly recap
Sunday post: best dog of the week, worst dog, the most common trait, who got the rarest
breed. All of it is a `list` over seven days of existing keys. It gives the Discord channel
a rhythm without asking anyone to do anything.

### "Your dog last year"
One line on the page when a roll exists for the same date a year back. Free — the data is
already there and permanent. Pure warmth, zero mechanics.

### Trait rarity, shown
You know exactly how often each trait spawns. Telling a player "**only 0.9% of dogs have
this**" makes a trait they'd otherwise skim into a thing worth screenshotting. No new
content needed, just arithmetic over the existing tables.

### Let people name their dog
One text field, stored with the roll. Zero game impact and it's the single cheapest way to
make a dog feel like *theirs* rather than a hand you were dealt.

---

## 2. Content, which is the actual bottleneck

The generator is fine. The reason a dog stops surprising you is that there are 114 traits,
and at six a day you've seen most of them inside a month.

### More traits, obviously — but in a shape
Straight addition has diminishing returns. What doesn't:

- **Traits that reference each other.** "Ate a bee" and "Ate a bee. Again." already hint at
  this. A dog with both is funnier than a dog with either, and the generator could be told
  about a handful of such pairs and bias toward completing one occasionally.
- **Traits that contradict.** "Perfect bloodwork" next to "$400 a month in medication" is
  funny once and confusing twice. A small mutual-exclusion list would stop the generator
  undercutting its own jokes.
- **Traits keyed to the background.** "Underdressed for this" in the snow. "Not allowed in
  here" in a museum. Even a dozen of these would make the scene feel chosen rather than
  bolted on.

### Breed-flavoured traits
Now that breeds score, they could also *suggest*. A Husky that "talks back constantly", a
Dachshund with "structural concerns", a Border Collie that "has reorganised your
furniture". Not a full table per breed — a handful of traits that are merely more likely
for certain breeds, so the dog occasionally seems to know what it is.

*Cost:* this is the biggest item on the page and the one most likely to be worth it.

### More backgrounds, especially bad ones
46 scenes, and the memorable ones are the extremes. Hell is more interesting than A
Backyard. The middle of the rarity table is where the boredom lives.

---

## 3. Mechanics worth considering, with real trade-offs

### A second daily thing that isn't a roll
The problem with one roll a day is that once you've rolled, there's nothing to do. The fix
is *not* more rolls — it's something to do with the dog you have:

- **Guess the score.** Show the dog and its traits, let people guess the total before
  revealing. Skill-free but it makes you actually read the card. This is closest to what
  Wordle is: everyone gets the same puzzle and compares.
- **Pick your favourite of today's dogs.** A daily vote across the server, winner gets a
  crown on the leaderboard. Turns other people's dogs into something you look at.

Of these, **voting** is the one that makes a group channel livelier, because it gives
people a reason to open everyone else's card.

### A shared daily dog
Right now everyone gets a different dog, so there's nothing to compare. One shared "dog of
the day" that everyone sees, *alongside* your personal one, would give the channel a thing
to react to together. This is the structural difference between Dogdle and Wordle and it's
worth thinking hard about before adding more solo features.

### Trading or gifting
Fun to imagine, expensive to build, and it breaks the one-dog-a-day promise the moment
someone hoards. Mentioned mostly to argue against it.

---

## 4. Polish

- **The scene gets busy.** Eight traits with visuals can stack rays, spotlight and glitch
  into mush. A budget — at most N visual effects per layer, chosen by rarity — would make
  the striking ones strike.
- **Long trait names truncate** in the card sidebar ("Statistically the luckiest dog ali..").
  Either shorten the offenders or wrap to two lines.
- **The card is silent about rarity.** The ring colour encodes it and nobody knows that. A
  word would do.
- **No mobile check has been done** on the stage, which is where most Discord clicks land.
- **Nothing tells a new player the rules.** "One dog. Once a day. No rerolls." is on the
  page; that a dog has a *score* and how it's made is not.

---

## 5. Technical, invisible to players

- **The photo is a coin flip.** Dog CEO returns a random image per breed and some are
  blurry, dark, or a person holding a dog. A curated allowlist — or just picking from three
  and keeping the one with the best contrast — would raise the floor.
- **`/api/verify-breeds` is manual.** It could run weekly in CI and open an issue when a
  slug rots.
- **The bot API has no rate limit.** The token is the only gate. Fine among friends, worth
  a counter if it ever leaks.
- **Cards are rendered on demand and cached.** Rendering the whole server's cards in one
  pass after midnight would make the digest instant, at the cost of rendering cards nobody
  asks for.
- **There's no way to see a dog from a past date on the site** — only the API has history.

---

## What I'd actually do first

1. **Group streak + weekly recap.** Cheapest route to the channel feeling alive.
2. **A content pass with background-aware and breed-aware traits.** The generator is
   already better than the content it has to work with.
3. **Daily voting.** The one mechanic that makes other people's dogs matter to you.

And I'd resist personal streaks, currencies, and anything with an inventory.
