// Records what the generator currently produces, so a refactor can be proved to change
// nothing. Re-run it only when a content change is meant to alter existing seeds -- the
// diff it produces is then the thing to read.
//
//   node scripts/bake-golden.mjs

import { writeFileSync } from "fs";
import { rollDailyDog } from "../src/roll.js";
import { SEEDS } from "../test/golden-seeds.js";

const dogs = SEEDS.map(([player, date]) => rollDailyDog(player, date));
writeFileSync("test/golden.json", JSON.stringify(dogs, null, 1) + "\n");

const scores = dogs.map((d) => d.score);
console.log(`baked ${dogs.length} dogs, scores ${Math.min(...scores)}..${Math.max(...scores)}`);
