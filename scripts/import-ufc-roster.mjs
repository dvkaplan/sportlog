import { writeFileSync, readFileSync } from "fs";

const slugify = (n) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const res = await fetch(
  "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_current_UFC_fighters&prop=text&format=json&origin=*",
  { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } }
);
const html = (await res.json())?.parse?.text?.["*"] ?? "";
if (!html) { console.log("Failed to fetch page"); process.exit(1); }

const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = new Map(
  [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => [m[2].toLowerCase(), m[1]])
);

const roster = [];
const records = {}; // slug -> record, INCLUDING curated fighters
const seen = new Set();
let division = null;

const tokens = html.split(/(<h[23][^>]*>[\s\S]*?<\/h[23]>|<tr[\s\S]*?<\/tr>)/g);
for (const t of tokens) {
  if (/^<h[23]/.test(t)) {
    const m = t.match(/id="([^"]+)"/);
    division = m && /weight/i.test(m[1])
      ? m[1].replace(/_/g, " ").replace(/\s*\(.*$/, "").replace(/s$/, "")
      : null;
    continue;
  }
  if (!division || !/^<tr/.test(t)) continue;

  // TEXT anchors only — flags wrap <img>, so requiring text content skips them
  const anchors = [...t.matchAll(/<a href="\/wiki\/[^"]+"[^>]*>([^<]{3,})<\/a>/g)]
    .map((m) => m[1].trim())
    .filter((x) => !/^(edit|citation|\[)/i.test(x));
  if (anchors.length === 0) continue;
  const name = anchors[0].replace(/ \(.*\)$/, "");
  if (/^(UFC|Road to UFC|The Ultimate Fighter|Dana White|Contender Series)/i.test(name)) continue;

  const text = t.replace(/<[^>]+>/g, " ");
  const recM = text.match(/\b(\d{1,3})[–-](\d{1,3})(?:[–-](\d{1,3}))?(?:\s*\(\d+\s*NC\))?/);
  if (!recM) continue;
  const record = recM[3] && recM[3] !== "0"
    ? `${recM[1]}–${recM[2]}–${recM[3]}`
    : `${recM[1]}–${recM[2]}`;

  const curSlug = curated.get(name.toLowerCase());
  if (curSlug) { records[curSlug] = record; continue; } // record for curated, no duplicate entry

  const slug = slugify(name);
  if (seen.has(slug)) continue;
  seen.add(slug);
  records[slug] = record;
  roster.push({ slug, name, sport: "mma", division, era: "Active", record, blurb: `Active UFC ${division.toLowerCase()}.` });
}

writeFileSync("src/lib/ufc-roster.json", JSON.stringify(roster, null, 2));
writeFileSync("src/lib/roster-records.json", JSON.stringify(records, null, 2));
const byDiv = {};
for (const r of roster) byDiv[r.division] = (byDiv[r.division] ?? 0) + 1;
console.log(`Imported ${roster.length} roster fighters + ${Object.keys(records).length} records:`);
for (const [d, c] of Object.entries(byDiv)) console.log(`  ${d}: ${c}`);