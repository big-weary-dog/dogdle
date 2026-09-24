// Checks every recent Discord roll end to end, the way a player would see it: is the card
// in KV, does its URL load for Discord's image proxy on each hostname, and does the card
// re-render cleanly from the stored dog with its real photo. Read-only.
//
// Run by .github/workflows/card-audit.yml, which dumps KV into the working directory
// first -- this sandbox has no route to Cloudflare or dog.ceo.
//
//   rolls.jsonl   one {"key", "value"} per recent Discord roll
//   cards.json    `wrangler kv key list --prefix=card:discord-`
//
// Env: WORKERS_HOST (dogdle.<sub>.workers.dev), ZONE_HOST (dogdle.swampkat.com).
// Writes the cards it downloads to cards/, for the GIF check and the artifact.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { renderCardGif } from "../src/card.js";
import { decodePhoto } from "../src/draw.js";

// Discord's media proxy announces itself like this when it fetches an embed image.
const DISCORD_UA = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
const WORKERS_HOST = process.env.WORKERS_HOST || "";
const ZONE_HOST = process.env.ZONE_HOST || "dogdle.swampkat.com";

const rolls = existsSync("rolls.jsonl")
  ? readFileSync("rolls.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];
const cardKeys = new Map(
  (existsSync("cards.json") ? JSON.parse(readFileSync("cards.json", "utf8")) : []).map((k) => [k.name, k])
);

mkdirSync("cards", { recursive: true });

const problems = [];
const flag = (who, what) => problems.push(`${who}: ${what}`);
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

async function probe(host, path) {
  if (!host) return { status: "skipped" };
  try {
    const res = await fetch(`https://${host}${path}`, {
      headers: { "user-agent": DISCORD_UA, accept: "image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const body = new Uint8Array(await res.arrayBuffer());
    return {
      status: res.status,
      type: res.headers.get("content-type") || "",
      mitigated: res.headers.get("cf-mitigated") || "",
      bytes: body.byteLength,
      body,
    };
  } catch (err) {
    return { status: `fetch failed: ${err.message}` };
  }
}

// Width, height and flavour straight from the JPEG's frame header, without decoding it:
// the decoder allocates per pixel, so a huge photo is what would blow a Worker's memory.
function jpegInfo(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) {
    const sig = [...b.slice(0, 4)].map((x) => x.toString(16).padStart(2, "0")).join("");
    return { kind: `not a JPEG (starts ${sig})` };
  }
  let p = 2;
  while (p + 9 < b.length) {
    if (b[p] !== 0xff) return { kind: "JPEG, unparseable" };
    const marker = b[p + 1];
    const len = (b[p + 2] << 8) | b[p + 3];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        kind: marker === 0xc2 ? "progressive JPEG" : marker === 0xc0 || marker === 0xc1 ? "baseline JPEG" : `JPEG SOF${marker - 0xc0}`,
        height: (b[p + 5] << 8) | b[p + 6],
        width: (b[p + 7] << 8) | b[p + 8],
        components: b[p + 9],
      };
    }
    p += 2 + len;
  }
  return { kind: "JPEG, no frame header" };
}

console.log(`${rolls.length} recent Discord roll(s); ${cardKeys.size} Discord card key(s) in KV`);
console.log(`hosts: workers=${WORKERS_HOST || "(unknown)"} zone=${ZONE_HOST}\n`);

for (const { key, value: dog } of rolls.sort((a, b) => a.key.localeCompare(b.key))) {
  const [, player, date] = key.split(":");
  const who = `${dog.player || "(anon)"} ${player} ${date}`;
  console.log(`=== ${who}${dog.test ? "  [test]" : ""} ===`);
  console.log(`  ${dog.name} the ${dog.breed}, score ${dog.score}`);

  const listed = cardKeys.get(`card:${player}:${date}`);
  console.log(`  card in KV : ${listed ? `yes ${JSON.stringify(listed.metadata ?? {})}` : "NO"}`);
  if (!listed) flag(who, "no card in KV -- its image URL is a 404");

  const path = `/i/${player}/${date}.gif`;
  for (const [label, host] of [["workers.dev", WORKERS_HOST], ["swampkat", ZONE_HOST]]) {
    const r = await probe(host, path);
    const extra = r.mitigated ? ` cf-mitigated=${r.mitigated}` : "";
    console.log(`  GET ${label.padEnd(11)}: ${r.status} ${r.type ?? ""} ${r.bytes ?? ""}B${extra}`);
    if (r.status !== 200 && r.status !== "skipped") flag(who, `${label} image URL answers ${r.status}${extra}`);
    if (r.status === 200 && label === "workers.dev") writeFileSync(`cards/${player}-${date}.gif`, r.body);
  }

  // The render, replayed offline from the stored dog and its real photo. A crash or a
  // decode that would not fit in a Worker shows up here even if KV looks fine.
  if (!dog.photo) {
    console.log("  photo      : NONE STORED");
    flag(who, "no photo URL stored");
  } else {
    let bytes = null;
    try {
      const res = await fetch(dog.photo, { signal: AbortSignal.timeout(15000) });
      console.log(`  photo      : ${res.status} ${res.headers.get("content-type")} ${res.headers.get("content-length") ?? "?"}B ${dog.photo}`);
      if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
      else flag(who, `photo answers ${res.status}`);
    } catch (err) {
      console.log(`  photo      : fetch failed ${err.message}`);
      flag(who, `photo fetch failed: ${err.message}`);
    }

    if (bytes) {
      const info = jpegInfo(bytes);
      const px = info.width && info.height ? info.width * info.height : 0;
      console.log(`  photo body : ${bytes.byteLength}B ${info.kind}${px ? ` ${info.width}x${info.height} (${(px / 1e6).toFixed(1)}MP, ${info.components} comp)` : ""}`);
      if (bytes.byteLength > 6_000_000) flag(who, `photo is ${mb(bytes.byteLength)}, over the 6MB cap -- card drawn with no dog`);

      global.gc?.();
      const before = process.memoryUsage();
      const t0 = performance.now();
      const img = decodePhoto(bytes);
      const t1 = performance.now();
      const after = process.memoryUsage();
      console.log(`  decode     : ${img ? `ok ${(t1 - t0).toFixed(0)}ms` : "FAILED"} +${mb(after.arrayBuffers + after.heapUsed - before.arrayBuffers - before.heapUsed)} js/buffers`);
      if (!img) flag(who, `photo does not decode (${info.kind}) -- card drawn with no dog`);
      if (px > 8e6) flag(who, `photo is ${(px / 1e6).toFixed(1)}MP -- decoding it may not fit in a Worker's 128MB`);

      try {
        const t2 = performance.now();
        const gif = renderCardGif(dog, { photo: bytes });
        console.log(`  render     : ok ${(performance.now() - t2).toFixed(0)}ms ${gif.length}B`);
      } catch (err) {
        console.log(`  render     : THREW ${err.stack}`);
        flag(who, `render threw: ${err.message}`);
      }
    }
  }
  console.log();
}

console.log("=== summary ===");
if (!problems.length) console.log("nothing wrong found");
for (const p of problems) console.log(`  ${p}`);
