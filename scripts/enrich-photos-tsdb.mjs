import { writeFileSync, readFileSync } from "fs";
const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const OK = new Set(["fighting", "boxing", "mma", "muay thai", "kickboxing"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
let roster = [];
try { roster = JSON.parse(readFileSync("src/lib/ufc-roster.json", "utf8")).map((r) => ({ slug: r.slug, name: r.name })); } catch {}
const pairs = [...curated, ...roster];

const media = JSON.parse(readFileSync("src/lib/fighter-media.json", "utf8"));
let i = 0, added = 0;
for (const { slug, name } of pairs) {
  i++;
  const entry = media[slug] ?? { idPlayer: null, photo: null, bio: null };
  if (entry.photo) continue;
  let list = null;
  for (let a = 1; a <= 2 && list === null; a++) {
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(name)}`);
      const j = await res.json();
      list = j?.player ?? null;
      if (list === null && a < 2) await sleep(4000);
    } catch { if (a < 2) await sleep(4000); }
  }
  const match = (list ?? []).find((p) => OK.has((p.strSport ?? "").toLowerCase()) && (p.strCutout || p.strThumb));
  if (match) {
    entry.photo = match.strCutout ?? match.strThumb;
    media[slug] = entry;
    added++;
    console.log(`${i}/${pairs.length} ${name}: ✓ TSDB photo`);
  }
  if (i % 20 === 0) writeFileSync("src/lib/fighter-media.json", JSON.stringify(media, null, 2));
  await sleep(700);
}
writeFileSync("src/lib/fighter-media.json", JSON.stringify(media, null, 2));
console.log(`\nDone. Added ${added} photos from TheSportsDB.`);