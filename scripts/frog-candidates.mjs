// Pulls openly licensed frog photos from Wikimedia Commons into a folder, with a
// candidates.json of who took each one and under what licence. Run by frog-photos.yml,
// since cloud sessions can't reach Wikimedia; the good ones are then copied by hand into
// public/frogs/ and credited in FROG_PHOTOS.
//
//   node scripts/frog-candidates.mjs <out-dir> [max]

import { mkdir, writeFile } from "node:fs/promises";

const [outDir, max = "60"] = process.argv.slice(2);
if (!outDir) throw new Error("usage: frog-candidates.mjs <out-dir> [max]");

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "Dogdle/1.0 (https://dogdle.swampkat.com; frog photo curation)";
const WIDTH = 640;

// Featured and quality pictures first: they're sharp, well lit and mostly one animal.
const SEARCHES = [
  'frog incategory:"Featured_pictures_on_Wikimedia_Commons"',
  'toad incategory:"Featured_pictures_on_Wikimedia_Commons"',
  'frog incategory:"Quality_images"',
  'toad incategory:"Quality_images"',
  "treefrog incategory:\"Quality_images\"",
];

// Anything that isn't a whole, live, grown-up frog.
const SKIP = /tadpole|egg|spawn|skeleton|dead|illustration|drawing|stamp|map|museum|preserved|specimen|mating|amplexus|diagram|logo|statue|sculpture/i;
// Licences that allow reuse on a website with credit.
const OPEN = /^(CC0|Public domain|PD|CC BY(-SA)? \d)/i;

const stripTags = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

const found = new Map();
for (const search of SEARCHES) {
  const body = await api({
    action: "query",
    generator: "search",
    gsrsearch: search,
    gsrnamespace: "6",
    gsrlimit: "50",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(WIDTH),
  });
  const pages = body.query?.pages ?? [];
  let kept = 0;
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || found.has(page.title)) continue;
    const meta = info.extmetadata ?? {};
    const license = meta.LicenseShortName?.value ?? "";
    const ratio = info.width / info.height;
    if (info.mime !== "image/jpeg" || !OPEN.test(license) || SKIP.test(page.title)) continue;
    if (ratio < 1 || ratio > 1.8) continue; // the frame is a landscape ellipse
    found.set(page.title, {
      title: page.title,
      page: info.descriptionurl,
      thumb: info.thumburl,
      artist: stripTags(meta.Artist?.value) || "unknown",
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
    });
    kept++;
  }
  console.log(`${String(kept).padStart(3)} of ${String(pages.length).padStart(2)} kept  ${search}`);
}

await mkdir(outDir, { recursive: true });
const picked = [...found.values()].slice(0, Number(max));
for (const [i, c] of picked.entries()) {
  c.file = `${String(i + 1).padStart(2, "0")}.jpg`;
  const res = await fetch(c.thumb, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.log(`skip ${c.title}: ${res.status}`);
    c.file = null;
    continue;
  }
  await writeFile(`${outDir}/${c.file}`, new Uint8Array(await res.arrayBuffer()));
  console.log(`${c.file}  ${c.license.padEnd(14)} ${c.title}`);
  await new Promise((r) => setTimeout(r, 300)); // be polite to the thumbnail servers
}

await writeFile(`${outDir}/candidates.json`, JSON.stringify(picked.filter((c) => c.file), null, 2) + "\n");
