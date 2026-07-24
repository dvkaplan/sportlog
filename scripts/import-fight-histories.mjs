import { writeFileSync, readFileSync } from "fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIKI_OVERRIDES = {
  "Mirko Cro Cop": "Mirko Filipović",
  "Ryan Garcia": "Ryan García",
  "David Benavídez": "David Benavidez",
  "Sean O'Malley": "Sean O'Malley (fighter)",
  "Mauricio Shogun Rua": "Maurício Rua",
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
  const FORCE = new Set(["don-frye", "jared-cannonier", "kelvin-gastelum", "vicente-luque","manny-pacquiao", "santiago-luna"]);
  if (!FORCE.has(slug) && hist[slug]?.length) { if (i % 50 === 0) console.log(`${i}/${pairs.length} …done through here`); continue; }
const candidates = [WIKI_OVERRIDES[name] ?? name, `${name} (fighter)`, `${name} (boxer)`, `Boxing career of ${name}`, `Professional boxing record of ${name}`,];
  let html = null;
  for (const title of candidates) {
    for (let a = 1; a <= 3 && html === null; a++) {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
          { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } }
        );
        if (res.status === 429 || res.status === 503) { await sleep(7000 * a); continue; }
        const j = await res.json();
        html = j?.parse?.text?.["*"] ?? null;
        if (!html) break;
      } catch { await sleep(7000 * a); }
    }
    if (html && /<th[^>]*>\s*(Res\.|Result)/i.test(html)) break; // has a record table → keep
    html = null; // wrong page → try next candidate
  }
  if (!html) { console.log(`${i}/${pairs.length} ${name}: ✗ no fighter page/record found`); continue; }

  const tables = html.split(/<table/i).slice(1).map((t) => "<table" + t.split(/<\/table>/i)[0] + "</table>");
let fights = [];
  for (const table of tables) {
   const firstRows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].slice(0, 3).map((m) => m[0]);
    let headers = [];
    let headerIdx = 0;
    for (let hr = 0; hr < firstRows.length; hr++) {
      const hs = [...firstRows[hr].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => clean(m[1]).toLowerCase());
      if (hs.some((h) => h.includes("opponent"))) { headers = hs; headerIdx = hr; break; }
    }
    if (!headers.some((h) => h.includes("opponent")) || !headers.some((h) => h.startsWith("res"))) continue;
    const idx = (frag) => headers.findIndex((h) => h.includes(frag));
    const iRes = idx("res"), iRec = idx("record"), iOpp = idx("opponent"),
      iMeth = idx("method") !== -1 ? idx("method") : idx("type"),
      iEvt = idx("event"), iDate = idx("date");
    const cur = [];
    const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].slice(headerIdx + 1);
    for (const r of rows) {
      const cells = [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => clean(m[1]));
      if (cells.length < 3) continue;
      const result = (cells[iRes] ?? "").toLowerCase();
      if (!/^(win|loss|draw|nc|no contest)/.test(result)) continue;
      cur.push({
        result: result.startsWith("win") ? "W" : result.startsWith("loss") ? "L" : result.startsWith("draw") ? "D" : "NC",
        record: cells[iRec] ?? "",
        opponent: cells[iOpp] ?? "",
        method: iMeth >= 0 ? cells[iMeth] ?? "" : "",
        event: iEvt >= 0 ? cells[iEvt] ?? "" : "",
        date: iDate >= 0 ? cells[iDate] ?? "" : "",
      });
    }
    if (cur.length > fights.length) fights = cur; // keep the LONGEST record table
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