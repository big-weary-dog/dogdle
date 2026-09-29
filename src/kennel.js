// The kennel: a player's collection. Everything their dogs have turned up -- breeds,
// places, traits, tiers -- counted against everything that can turn up, and drawn as one
// still image for the Discord bot.
//
// Pure: stored dogs in, numbers and GIF bytes out. The KV reads live in bot.js.

import { RasterSurface } from "./raster.js";
import { GIFEncoder, quantize, applyPalette } from "../public/vendor/gifenc.js";
import { BREEDS, RARITIES, RARITY_ORDER } from "./breeds.js";
import { BACKGROUNDS, MODIFIERS, QUALITY_TIERS, FROG } from "./content/index.js";
import { qualityFor } from "./roll.js";
import { drawText, drawEmoji, fillRect, hexToRgb, textWidth, fitText } from "./draw.js";

// The top 320px match a card; the calendar strip runs underneath.
export const KENNEL = { width: 560, height: 420, top: 320 };

// Everything the album draws that isn't a background: its own labels, and the tier emoji,
// which no card draws. scripts/build-atlas.mjs bakes these.
export const KENNEL_EMOJI = ["🐾", "🧬", "🗺️", "✨", "🏆", ...QUALITY_TIERS.map((t) => t.emoji)];

const PANEL = [17, 20, 27];
const ROW = [26, 31, 41];
const EMPTY = [22, 26, 34];
const MUTED = [152, 161, 179];
const WHITE = [243, 244, 246];

// Only what can still turn up is worth collecting: an obsolete trait never spawns again,
// so counting it would leave every album permanently short of complete.
const LIVE_TRAITS = new Set(MODIFIERS.filter((m) => !m.obsolete).map((m) => m.text));
const BREED_RARITY = new Map(BREEDS.map((b) => [b.name, b.rarity]));
const BACKGROUND = new Map(BACKGROUNDS.map((b) => [b.key, b]));
const rank = (rarity) => RARITY_ORDER.indexOf(rarity);

// Common first, legendary last: the grid reads as a climb, and the gaps that matter most
// sit at the end where they're easy to spot.
const GRID = [...BACKGROUNDS].sort(
  (a, b) => rank(a.rarity) - rank(b.rarity) || a.name.localeCompare(b.name)
);

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
export const summary = (dog) => {
  const tier = qualityFor(dog.score);
  return {
    name: dog.name,
    breed: dog.breed,
    score: dog.score,
    date: dog.date,
    quality: tier.label,
    qualityEmoji: tier.emoji,
    ...(dog.frog ? { frog: true } : {}),
  };
};

// `dogs` oldest first. A tie for best or worst keeps the first dog to get there. Frogs
// are never either: one is a bad day by design, and it would own the worst slot forever.
export function buildKennel(dogs) {
  const breeds = new Set();
  const places = new Set();
  const traits = new Set();
  const tiers = new Set();
  let frogs = 0;
  let best = null;
  let worst = null;
  let total = 0;
  let counted = 0;

  for (const dog of dogs) {
    if (dog.frog) frogs++;
    else if (BREED_RARITY.has(dog.breed)) breeds.add(dog.breed);
    if (BACKGROUND.has(dog.background?.key)) places.add(dog.background.key);
    // A frog's traits are its own table, not part of the dog collection.
    if (!dog.frog) for (const m of dog.modifiers ?? []) if (LIVE_TRAITS.has(m.text)) traits.add(m.text);
    tiers.add(qualityFor(dog.score).label);
    if (dog.frog) continue;
    total += dog.score;
    counted++;
    if (!best || dog.score > best.score) best = dog;
    if (!worst || dog.score < worst.score) worst = dog;
  }

  const finds = [
    ...[...breeds].map((name) => ({ kind: "breed", name, emoji: "🧬", rarity: BREED_RARITY.get(name) })),
    ...[...places].map((key) => {
      const b = BACKGROUND.get(key);
      return { kind: "background", name: b.name, emoji: b.emoji, rarity: b.rarity };
    }),
  ];
  const rarest = finds
    .sort((a, b) => rank(b.rarity) - rank(a.rarity) || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((f) => ({ ...f, rarityLabel: RARITIES[f.rarity].label, rarityColor: RARITIES[f.rarity].color }));

  // The average dog, to one decimal, and the tier it would land in. Frogs stay out of
  // both, as they do out of the game's own balance.
  const average = counted ? Math.round((total / counted) * 10) / 10 : null;
  const tier = average === null ? null : qualityFor(average);

  return {
    days: dogs.length,
    frogs,
    total,
    average,
    averageQuality: tier && { label: tier.label, emoji: tier.emoji, color: tier.color },
    breeds: { found: breeds.size, total: BREED_RARITY.size },
    backgrounds: { found: places.size, total: BACKGROUND.size },
    traits: { found: traits.size, total: LIVE_TRAITS.size },
    tiers: { found: tiers.size, total: QUALITY_TIERS.length },
    best: best && summary(best),
    worst: worst && summary(worst),
    rarest,
    // Which places and tiers, for the image. Keys and labels, so they survive JSON.
    placesFound: [...places],
    tiersFound: [...tiers],
    calendar: dogs.map((d) => ({ date: d.date, score: d.score, ...(d.frog ? { frog: true } : {}) })),
  };
}

// A progress bar with its label and count above it.
function drawBar(s, x, y, w, emoji, label, { found, total }, color) {
  drawEmoji(s, emoji, x, y - 1, 14);
  drawText(s, "sm", label, x + 19, y + 10, WHITE);
  const count = `${found}/${total}`;
  drawText(s, "sm", count, x + w - textWidth("sm", count), y + 10, MUTED);
  fillRect(s, x, y + 17, w, 5, ROW);
  const filled = total ? Math.max(found ? 2 : 0, Math.round((w * found) / total)) : 0;
  fillRect(s, x, y + 17, filled, 5, color);
}

// One of the card-style rows: emoji, text, and a value on the right.
function drawRow(s, x, y, w, emoji, text, value, valueColor) {
  fillRect(s, x, y, w, 19, ROW);
  drawEmoji(s, emoji, x + 4, y + 2, 15);
  const valueW = value ? textWidth("sm", value) : 0;
  drawText(s, "sm", fitText("sm", text, w - 32 - valueW), x + 24, y + 13, WHITE);
  if (value) drawText(s, "sm", value, x + w - valueW - 5, y + 13, valueColor);
}

// The biggest square tile that fits `n` tiles into the box, and how many go on a row.
function gridFit(n, w, h, gap) {
  for (let tile = 40; tile > 8; tile--) {
    const cols = Math.floor((w + gap) / (tile + gap));
    if (Math.ceil(n / cols) * (tile + gap) - gap <= h) return { tile, cols };
  }
  return { tile: 8, cols: Math.floor((w + gap) / (8 + gap)) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86400000;
const TIER_COLORS = QUALITY_TIERS.map((t) => hexToRgb(t.color));
const dayColor = (d) => (d.frog ? hexToRgb(FROG.color) : TIER_COLORS[QUALITY_TIERS.indexOf(qualityFor(d.score))]);

// A year of days as a strip of squares, one column a week, coloured by how good the dog
// was. It ends on the newest roll rather than today, so a redraw is always identical.
function drawCalendar(s, x, y, calendar) {
  if (!calendar.length) return;
  const weeks = 53;
  const cell = 8;
  const step = cell + 2;
  const byDate = new Map(calendar.map((d) => [d.date, d]));
  const end = Date.parse(`${calendar.at(-1).date}T00:00:00Z`);
  const start = end - ((weeks - 1) * 7 + new Date(end).getUTCDay()) * DAY_MS;

  let lastLabel = -Infinity;
  for (let col = 0; col < weeks; col++) {
    const cx = x + col * step;
    const first = new Date(start + col * 7 * DAY_MS);
    // A month is labelled over the first week it starts in, if there's room.
    if (first.getUTCDate() <= 7 && cx - lastLabel >= 28) {
      drawText(s, "sm", MONTHS[first.getUTCMonth()], cx, y - 5, MUTED);
      lastLabel = cx;
    }
    for (let row = 0; row < 7; row++) {
      const t = start + (col * 7 + row) * DAY_MS;
      if (t > end) break;
      const dog = byDate.get(new Date(t).toISOString().slice(0, 10));
      fillRect(s, cx, y + row * step, cell, cell, dog ? dayColor(dog) : EMPTY);
    }
  }
}

// What the album page draws that the stats don't carry: every place in grid order, and the
// tier ladder. A place not found yet gives away only its rarity.
export function albumLayout(kennel) {
  const found = new Set(kennel.placesFound);
  const reached = new Set(kennel.tiersFound);
  return {
    places: GRID.map((b) =>
      found.has(b.key) ? { found: true, emoji: b.emoji, name: b.name, rarity: b.rarity } : { found: false, rarity: b.rarity }
    ),
    tierList: QUALITY_TIERS.map((t) => ({ emoji: t.emoji, label: t.label, color: t.color, found: reached.has(t.label) })),
    rarityColors: Object.fromEntries(RARITY_ORDER.map((r) => [r, RARITIES[r].color])),
  };
}

export function composeKennel(kennel, name) {
  const { width: w, height: h, top } = KENNEL;
  const s = new RasterSurface(w, h);
  fillRect(s, 0, 0, w, h, PANEL);

  // Left column: whose kennel, how far along, and the highlights.
  const x = 14;
  const col = 222;
  drawEmoji(s, "🐾", x, 11, 18);
  drawText(s, "lg", name ? `${name}'s Kennel` : "Kennel", x + 24, 26, WHITE, col - 24);
  const dogsLine = `${kennel.days} ${kennel.days === 1 ? "dog" : "dogs"}` +
    (kennel.frogs ? `, ${kennel.frogs} ${kennel.frogs === 1 ? "frog" : "frogs"}` : "") +
    (kennel.average === null ? "" : `, total ${signed(kennel.total)}`);
  drawText(s, "sm", dogsLine, x, 44, MUTED, col);
  fillRect(s, x, 53, col, 1, [38, 43, 54]);

  drawBar(s, x, 62, col, "🧬", "Breeds", kennel.breeds, hexToRgb(RARITIES.rare.color));
  drawBar(s, x, 90, col, "🗺️", "Places", kennel.backgrounds, hexToRgb(RARITIES.uncommon.color));
  drawBar(s, x, 118, col, "✨", "Traits", kennel.traits, hexToRgb(RARITIES.legendary.color));

  // The tiers as a strip of their emoji, the ones never reached dimmed.
  drawEmoji(s, "🏆", x, 145, 14);
  drawText(s, "sm", "Tiers", x + 19, 156, WHITE);
  const seen = new Set(kennel.tiersFound);
  const step = (col - 54) / QUALITY_TIERS.length;
  QUALITY_TIERS.forEach((t, i) => {
    const tx = x + 54 + i * step;
    drawEmoji(s, t.emoji, tx, 144, 16);
    if (!seen.has(t.label)) fillRect(s, tx, 144, 16, 16, [...PANEL, 0.8]);
  });

  let y = 170;
  const tierColor = (d) => hexToRgb(QUALITY_TIERS.find((t) => t.label === d.quality).color);
  if (kennel.best) {
    drawText(s, "sm", "Best", x, y + 9, MUTED);
    drawRow(s, x, y + 14, col, kennel.best.qualityEmoji, kennel.best.name, signed(kennel.best.score), tierColor(kennel.best));
    y += 36;
  }
  if (kennel.worst && kennel.worst !== kennel.best && kennel.worst.date !== kennel.best?.date) {
    drawText(s, "sm", "Worst", x, y + 9, MUTED);
    drawRow(s, x, y + 14, col, kennel.worst.qualityEmoji, kennel.worst.name, signed(kennel.worst.score), tierColor(kennel.worst));
    y += 36;
  }
  if (kennel.rarest.length) {
    drawText(s, "sm", "Rarest find", x, y + 9, MUTED);
    const r = kennel.rarest[0];
    drawRow(s, x, y + 14, col, r.emoji, r.name, r.rarityLabel, hexToRgb(r.rarityColor));
    y += 36;
  }
  if (kennel.averageQuality) {
    const a = kennel.averageQuality;
    drawText(s, "sm", "Average dog", x, y + 9, MUTED);
    drawRow(s, x, y + 14, col, a.emoji, a.label, signed(kennel.average), hexToRgb(a.color));
  }

  // Right: every place there is, found ones lit, with a strip of rarity colour on each.
  const gx = x + col + 14;
  const gw = w - gx - 12;
  const gap = 2;
  const { tile, cols } = gridFit(GRID.length, gw, top - 24, gap);
  const rows = Math.ceil(GRID.length / cols);
  const gy = Math.round((top - (rows * (tile + gap) - gap)) / 2);
  const found = new Set(kennel.placesFound);
  GRID.forEach((b, i) => {
    const tx = gx + (i % cols) * (tile + gap);
    const ty = gy + Math.floor(i / cols) * (tile + gap);
    const lit = found.has(b.key);
    fillRect(s, tx, ty, tile, tile, lit ? ROW : EMPTY);
    fillRect(s, tx, ty + tile - 2, tile, 2, [...hexToRgb(RARITIES[b.rarity].color), lit ? 1 : 0.3]);
    if (lit) {
      const size = tile - 9;
      drawEmoji(s, b.emoji, tx + (tile - size) / 2, ty + (tile - 2 - size) / 2, size);
    }
  });

  fillRect(s, x, top + 2, w - x * 2, 1, [38, 43, 54]);
  drawCalendar(s, x, top + 18, kennel.calendar);

  return s;
}

// One frame: nothing on an album moves, and a GIF keeps it in the same pipeline as cards.
export function renderKennelGif(kennel, name) {
  const s = composeKennel(kennel, name);
  const gif = GIFEncoder();
  const palette = quantize(s.data, 256);
  gif.writeFrame(applyPalette(s.data, palette), s.width, s.height, { palette });
  gif.finish();
  return gif.bytes();
}
