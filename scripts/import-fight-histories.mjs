import { writeFileSync, readFileSync } from "fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIKI_OVERRIDES = {
  "Mirko Cro Cop": "Mirko Filipović",
  "Ryan Garcia": "Ryan García",
  "David Benavídez": "David Benavidez",
  "Sean O'Malley": "Sean O'Malley (fighter)",
};

const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
let roster = [];
try { roster = JSON.parse(readFileSync("src/lib/ufc-roster.json", "utf8")).map((r) => ({ slug: r.slug, name: r.name })); } catch {}
const pairs = [...curated, ...roster];

let hist = {};
try { hist = JSON.parse(readFileSync("src/lib/fight-histories.json", "utf8")); } catch {}
writeFileSync("src/lib/fight-histories.json", JSON.stringify(hist)); // ensure file exists immediately

const clean = (s) => s.replace(/<[^>]+>/g, " ").replace(/\[\d+\]/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

let i = 0;
for (const { slug, name } of pairs) {
  i++;
  if (hist[slug]?.length) { if (i % 50 === 0) console.log(`${i}/${pairs.length} …done through here`); continue; }
  const title = WIKI_OVERRIDES[name] ?? name;
  let html = null, note = "";
  for (let a = 1; a <= 4 && html === null; a++) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } }
      );
      if (res.status === 429 || res.status === 503) { note = "rate limited"; await sleep(7000 * a); continue; }
      const j = await res.json();
      html = j?.parse?.text?.["*"] ?? null;
      if (!html) { note = "no page"; break; }
    } catch { note = "network"; await sleep(7000 * a); }
  }
  if (!html) { console.log(`${i}/${pairs.length} ${name}: ✗ ${note}`); continue; }

  const tables = html.split(/<table/i).slice(1).map((t) => "<table" + t.split(/<\/table>/i)[0] + "</table>");
  let fights = [];
  for (const table of tables) {
    const headRow = (table.match(/<tr[\s\S]*?<\/tr>/i) ?? [""])[0];
    const headers = [...headRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => clean(m[1]).toLowerCase());
    if (!headers.some((h) => h.includes("opponent")) || !headers.some((h) => h.startsWith("res"))) continue;
    const idx = (frag) => headers.findIndex((h) => h.includes(frag));
    const iRes = idx("res"), iRec = idx("record"), iOpp = idx("opponent"),
      iMeth = idx("method") !== -1 ? idx("method") : idx("type"),
      iEvt = idx("event"), iDate = idx("date");
    const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].slice(1);
    for (const r of rows) {
      const cells = [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => clean(m[1]));
      if (cells.length < 3) continue;
      const result = (cells[iRes] ?? "").toLowerCase();
      if (!/^(win|loss|draw|nc|no contest)/.test(result)) continue;
      fights.push({
        result: result.startsWith("win") ? "W" : result.startsWith("loss") ? "L" : result.startsWith("draw") ? "D" : "NC",
        record: cells[iRec] ?? "",
        opponent: cells[iOpp] ?? "",
        method: iMeth >= 0 ? cells[iMeth] ?? "" : "",
        event: iEvt >= 0 ? cells[iEvt] ?? "" : "",
        date: iDate >= 0 ? cells[iDate] ?? "" : "",
      });
    }
    if (fights.length > 0) break; // first matching record table wins
  }
  if (fights.length > 0) {
    hist[slug] = fights;
    console.log(`${i}/${pairs.length} ${name}: ✓ ${fights.length} fights`);
  } else console.log(`${i}/${pairs.length} ${name}: ✗ no record table found`);
  if (i % 10 === 0) writeFileSync("src/lib/fight-histories.json", JSON.stringify(hist));
  await sleep(2000);
}
writeFileSync("src/lib/fight-histories.json", JSON.stringify(hist));
console.log(`\nDone. Histories for ${Object.keys(hist).length} fighters.`);