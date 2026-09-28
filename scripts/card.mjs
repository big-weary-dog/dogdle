// Renders the Discord card for a given player and day, offline, to see what a change to
// the content or the renderer actually looks like. There's no network here, so the photo
// slot is empty -- which is also exactly what a card looks like when Dog CEO is down.
//
//   node scripts/card.mjs                           three sample players -> card-*.gif
//   node scripts/card.mjs alice,bob 2026-09-22      those players on that day
//   node scripts/card.mjs alice --frog              whatever alice was, as a frog
//
// The output is an animated GIF; open it with the Read tool to see the first frame.

import { writeFileSync } from "fs";
import { renderCardGif, CARD } from "../src/card.js";
import { rollDailyDog, today } from "../src/roll.js";

const args = process.argv.slice(2);
const frog = args.includes("--frog") ? { frog: true } : {};
const [playerArg = "sample-1,sample-2,sample-3", date = today()] = args.filter((a) => a !== "--frog");

for (const player of playerArg.split(",")) {
  const dog = rollDailyDog(player, date, frog);
  const started = process.hrtime.bigint();
  const gif = renderCardGif(dog);
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  const out = `card-${player}.gif`;
  writeFileSync(out, Buffer.from(gif));

  const traits = dog.modifiers.map((m) => `${m.emoji} ${m.text} (${m.value > 0 ? "+" : ""}${m.value})`);
  console.log(`${out}: ${dog.name} the ${dog.breed} in ${dog.background.name}`);
  console.log(`  ${dog.qualityEmoji} ${dog.qualityLabel} ${dog.score}  |  ${ms.toFixed(0)} ms, ${(gif.length / 1024).toFixed(0)} KB`);
  for (const t of traits) console.log(`  ${t}`);
}
console.log(`\n${CARD.width}x${CARD.height}`);
