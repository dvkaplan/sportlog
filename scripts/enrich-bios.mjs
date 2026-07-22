import { writeFileSync, readFileSync } from "fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIKI_OVERRIDES = {
  "Mirko Cro Cop": "Mirko Filipović",
  "Ryan Garcia": "Ryan García",
  "David Benavídez": "David Benavidez",
  "Sean O'Malley": "Sean O'Malley (fighter)",
  "Leon Edwards": "Leon Edwards",
};
const PHOTO_SWAP = new Set(["mike-tyson", "anderson-silva"]);

const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
let roster = [];
try { roster = JSON.parse(readFileSync("src/lib/ufc-roster.json", "utf8")).map((r) => ({ slug: r.slug, name: r.name })); } catch {}
const pairs = [...curated, ...roster];

let media = {};
try { media = JSON.parse(readFileSync("src/lib/fighter-media.json", "utf8")); } catch {}

let i = 0;
for (const { slug, name } of pairs) {
  i++;
  const entry = media[slug] ?? { idPlayer: null, photo: null, bio: null };
  const needBio = !entry.bio;
  const needPhoto = !entry.photo || PHOTO_SWAP.has(slug);
  if (!needBio && !needPhoto) { if (i % 50 === 0) console.log(`${i}/${pairs.length} …complete through here`); continue; }

  const title = WIKI_OVERRIDES[name] ?? name;
  let json = null, note = "";
  for (let a = 1; a <= 4 && json === null; a++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } });
      if (res.status === 429 || res.status === 503) { note = "rate limited"; await sleep(6000 * a); continue; }
      if (!res.ok) { note = `HTTP ${res.status}`; break; }
      json = await res.json();
    } catch { note = "network"; await sleep(6000 * a); }
  }
  if (json) {
    const e = json.extract ?? null;
    if (needBio && e && /box|fight|mixed martial|mma|ufc|champion|kickbox/i.test(e)) entry.bio = e;
    const img = json.originalimage?.source ?? json.thumbnail?.source ?? null;
    if (needPhoto && img) entry.photo = img;
    media[slug] = entry;
    console.log(`${i}/${pairs.length} ${name}: ${entry.bio ? "bio✓" : "bio✗"} ${entry.photo ? "photo✓" : "photo✗"}`);
  } else console.log(`${i}/${pairs.length} ${name}: ✗ ${note}`);
  if (i % 15 === 0) writeFileSync("src/lib/fighter-media.json", JSON.stringify(media, null, 2));
  await sleep(1600);
}
writeFileSync("src/lib/fighter-media.json", JSON.stringify(media, null, 2));
console.log("\nDone.");