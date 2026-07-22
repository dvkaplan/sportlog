import { writeFileSync, readFileSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const OK_SPORTS = new Set(["fighting", "boxing", "mma", "muay thai", "kickboxing"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Parse slug/name pairs straight out of fighters.ts
const src = readFileSync("src/lib/fighters.ts", "utf8");
const pairs = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({
  slug: m[1],
  name: m[2],
}));
console.log(`Found ${pairs.length} fighters in fighters.ts`);

let media = {};
try { media = JSON.parse(readFileSync("src/lib/fighter-media.json", "utf8")); } catch {}

let i = 0;
for (const { slug, name } of pairs) {
  i++;
  if (media[slug]?.photo || media[slug]?.bio) {
    console.log(`${i}/${pairs.length} ${name}: already enriched`);
    continue;
  }
  let list = null;
  for (let attempt = 1; attempt <= 2 && list === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(name)}`);
      const json = await res.json();
      list = json?.player ?? null;
      if (list === null && attempt < 2) await sleep(4000);
    } catch { if (attempt < 2) await sleep(4000); }
  }
  const match = (list ?? []).find(
    (p) =>
      p.strPlayer?.toLowerCase() === name.toLowerCase() &&
      OK_SPORTS.has((p.strSport ?? "").toLowerCase())
  ) ?? (list ?? []).find((p) => OK_SPORTS.has((p.strSport ?? "").toLowerCase())) ?? null;

  if (!match) {
    console.log(`${i}/${pairs.length} ${name}: ✗ no fighter match`);
  } else {
    media[slug] = {
      idPlayer: match.idPlayer ?? null,
      photo: match.strCutout ?? match.strThumb ?? null,
      bio: match.strDescriptionEN ?? null,
    };
    console.log(`${i}/${pairs.length} ${name}: ✓ ${match.strCutout ? "photo" : "no photo"}, ${match.strDescriptionEN ? "bio" : "no bio"}`);
  }
  if (i % 20 === 0) writeFileSync("src/lib/fighter-media.json", JSON.stringify(media, null, 2));
  await sleep(700);
}
writeFileSync("src/lib/fighter-media.json", JSON.stringify(media, null, 2));
console.log(`\nDone. Enriched ${Object.keys(media).length} fighters → src/lib/fighter-media.json`);