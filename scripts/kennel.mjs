// Renders a kennel album offline: a player's dogs for the given number of days up to today,
// as if they'd rolled every one of them.
//
//   node scripts/kennel.mjs                 sample-1, 40 days -> kennel-sample-1.gif
//   node scripts/kennel.mjs alice,bob 7     those players, a week in
//
// Open the GIF with the Read tool.

import { writeFileSync } from "fs";
import { buildKennel, renderKennelGif, KENNEL } from "../src/kennel.js";
import { rollDailyDog, today } from "../src/roll.js";

const [playerArg = "sample-1", daysArg = "40"] = process.argv.slice(2);
const days = Number(daysArg);
const end = new Date(`${today()}T00:00:00Z`);

for (const player of playerArg.split(",")) {
  const dogs = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
    dogs.push(rollDailyDog(player, date));
  }
  const kennel = buildKennel(dogs);
  const started = process.hrtime.bigint();
  const gif = renderKennelGif(kennel, player);
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  const out = `kennel-${player}.gif`;
  writeFileSync(out, Buffer.from(gif));

  const { breeds: b, backgrounds: p, traits: t, tiers } = kennel;
  console.log(`${out}: ${kennel.days} dogs, ${kennel.frogs} frogs | breeds ${b.found}/${b.total}, ` +
    `places ${p.found}/${p.total}, traits ${t.found}/${t.total}, tiers ${tiers.found}/${tiers.total}`);
  console.log(`  ${ms.toFixed(0)} ms, ${(gif.length / 1024).toFixed(0)} KB`);
}
console.log(`\n${KENNEL.width}x${KENNEL.height}`);
