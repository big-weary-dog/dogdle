# Working on Dogdle

A once-a-day dog slot machine: one Cloudflare Worker with KV, live at
https://dogdle.swampkat.com. The README explains *why* things are the way they are; this
file is the short version of how to work here without breaking anything.

## Commands

```bash
npm test          # the whole suite, ~5s. Run it before every commit.
npm run balance   # where the average dog sits, tier spread, and what to nudge if it drifted
npm run sheet -- out.png beach,volcano   # contact sheet of backgrounds (omit keys for all)
npm run card -- alice,bob 2026-09-22     # render Discord cards offline -> card-<player>.gif
npm run bake      # re-record test/golden.json and test/content-inventory.json
npm run atlas     # rebuild src/generated/atlas.js after adding an emoji (needs Chromium)
npm run dev       # wrangler dev with local KV
```

Previews land in the working directory and are gitignored. Look at PNGs and GIFs with
the Read tool; don't guess at how a visual looks from its data.

## Map

| Where | What |
|---|---|
| `src/content/` | Everything a player sees: `traits/<category>.js`, `backgrounds.js`, `names.js`, `tiers.js`. `index.js` is the barrel. |
| `src/roll.js` | The deterministic generator. `hash(player:date)` seeds the PRNG. |
| `src/breeds.js` | Breed table, Dog CEO slugs, rarity weights and values. |
| `src/worker.js` | Web routes. `src/bot.js` is the Discord bot API (`/api/bot/*`). |
| `src/keys.js` | KV key layout and leaderboard rows, shared by web and bot. |
| `src/photo.js` | Dog CEO lookup, photo bytes, `backfillPhoto` repair. |
| `src/card.js` + `raster.js` + `draw.js` | Headless GIF card renderer (no canvas in Workers). |
| `public/effects.js` | **Shared** effect engine: the web page *and* the card both run it. |
| `public/app.js` | The web game. `public/dev.html` is `/dev`, unlimited rerolls. |
| `scripts/` | The npm scripts above. `scripts/lib/` is shared helpers. |
| `test/` | `node:test`, no dependencies. `golden.json` and `content-inventory.json` are snapshots. |
| `src/generated/atlas.js` | Baked glyphs and emoji. Built, committed, never hand-edited. |

## Branches and deploys

- The default branch is `claude/swampkat-online-game-wuc3kt`, and **every push to it
  deploys to production** (`deploy.yml`: tests, then wrangler). Work on your own branch
  and open a PR into it; `test.yml` runs the suite on every PR.
- Before opening or merging a PR, merge the latest default branch in and run `npm test`
  again. Other agents are merging too, and the balance test is only meaningful against
  everyone's content combined.

## Hard rules

1. **Never delete a trait.** Mark it `obsolete: true`: it stays resolvable for dogs that
   already carry it but never spawns again. Backgrounds have no `obsolete` flag yet, so
   retiring one means adding that filter to `src/roll.js` first.
2. **Rolls are immutable.** Nothing may re-deal a stored dog. Anything that changes what
   `rollDailyDog` returns for a given seed changes *future* dogs only, and will show up
   in `test/golden.json` — read that diff before re-baking.
3. **Keep the average dog at 0.** The test fails outside ±0.5. Correct drift by moving
   traits **one point each across many distinct, ungrouped traits** — never by piling
   the correction onto a few. `npm run balance` lists candidates. Backgrounds and breeds
   are the lopsided jackpots; traits are the balancer.
4. **A `group` must be inherently exclusive** (a dog has one build, one job), never just a
   shared theme. A group of one fails the tests.
5. **New emoji → `npm run atlas`.** The test suite names any emoji missing from the atlas.
6. **Backgrounds frame the dog.** The photo covers roughly x 0.2–0.8, y 0.15–0.77; put
   interest at the edges, the top and the ground. Check with `npm run sheet`.
7. **`public/effects.js` changes both renderers.** Check the web page (`/dev`) and a card
   (`npm run card`) after touching it.
8. **Never log, echo or commit `BOT_TOKEN`.** It lives in the `DOGDLE_BOT_TOKEN` repo
   secret and is synced by `deploy.yml`.
9. **`/img` stays locked to `images.dog.ceo`.** It must never become a general proxy.
10. Don't add Playwright (or any browser) to `package.json`; `npm run atlas` installs it
    unsaved. Don't create speculative idea/backlog docs.

## After changing content

1. `npm test`. A golden or inventory failure after an *intended* change → `npm run bake`,
   then read the diff it made: it should show exactly what you meant to change.
2. `npm run balance` if values, groups or pools changed.
3. `npm run atlas` if you used a new emoji.
4. Update the counts in the README (traits, groups, backgrounds) if they moved.

## Working in parallel

Several agents can work at once if each stays in a lane. Lanes are by file ownership:

| Lane | Owns | Touches shared files? |
|---|---|---|
| Traits | `src/content/traits/*.js` | Snapshots, maybe atlas |
| Backgrounds | `src/content/backgrounds.js` | Snapshots, maybe atlas |
| Names / tiers | `src/content/names.js`, `tiers.js` | Snapshots |
| Discord bot API | `src/bot.js`, `docs/discord-bot-prompt.md`, `test/bot.test.js` | `src/keys.js` if rows change |
| Web UI | `public/app.js`, `public/index.html`, `public/dev.*` | — |
| Card renderer | `src/card.js`, `src/draw.js`, `src/raster.js` | — |
| Effects engine | `public/effects.js`, `test/effects.test.js` | Affects web *and* card |
| Ops / CI | `.github/workflows/`, `wrangler.toml` | — |

**Conflict hotspots — regenerate, never hand-merge:**

- `test/golden.json`, `test/content-inventory.json`: take either side, then `npm run bake`.
- `src/generated/atlas.js`: take either side, then `npm run atlas`.
- `README.md` counts: recount from the code after merging.

**Balance is global.** Two content PRs can each pass alone and fail together. Whoever
merges second rebalances (rule 3) as part of their merge. Two content lanes at once is
fine; don't run two *balance corrections* at once.

## Environment gotchas

- **No egress** to dog.ceo, Cloudflare or swampkat.com from cloud sessions. Tests stub
  `fetch`. For anything live, use the manual GitHub Actions workflows: `bot-smoke.yml`
  (hits the prod bot API with test users), `kv-peek.yml` (read-only KV dump),
  `photo-audit.yml` (find/repair rolls missing photos), `verify-breeds.yml` (weekly slug
  check). Report blocked hosts rather than trying to route around them.
- `pkill -f <pattern>` matches its own shell when the pattern is in the command line and
  kills it. Run it on its own, or use a PID.
- Inside `node -e '...'`, an apostrophe in a comment or string ends the script silently.
  Write a file instead.
- A script that applies several edits should check every target exists **before** writing
  any of them, so a missed match aborts cleanly instead of half-applying.
