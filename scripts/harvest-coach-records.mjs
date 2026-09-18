import { readFileSync, writeFileSync, existsSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIMIT = Number(process.argv[2] ?? 0); // smoke test: node scripts/harvest-coach-records.mjs 10
const universe = JSON.parse(readFileSync("src/lib/coach-universe.json", "utf8"));
let out = {};
if (existsSync("src/lib/coach-records.json")) out = JSON.parse(readFileSync("src/lib/coach-records.json", "utf8"));
const RETRY = process.argv.includes("--retry-empty");
const entries = Object.entries(universe).filter(([slug]) => !out[slug] || (RETRY && out[slug].rows.length === 0));
const todo = LIMIT ? entries.slice(0, LIMIT) : entries;
console.log(`${todo.length} coaches to fetch (${Object.keys(out).length} already done).`);
let i = 0;
for (const [slug, c] of todo) {
  i++;
  try {
        const j = await fetch(`http://localhost:3000/api/coach-history?name=${encodeURIComponent(c.name)}&title=${encodeURIComponent(c.wiki)}`).then((r) => r.json());
    if (j?.error === "unavailable") { console.log(`${i}/${todo.length} ${c.name}: throttled — stopping; rerun later with --retry-empty`); break; }
    const rows = [];
    for (const t of j?.tables ?? []) {
      if (/college|ncaa|university/i.test(t.label)) continue;
      const cols = t.columns.map((x) => x.toLowerCase());
      const ti = cols.findIndex((x) => x === "team"), si = cols.findIndex((x) => /^(season|year)$/.test(x));
      if (ti < 0 || si < 0) continue;
      for (const r of t.rows) {
        const team = r[ti] ?? "", season = r[si] ?? "";
        if (!team || !/\d{4}/.test(season) || /total|career/i.test(team) || /:$/.test(team)) continue;
        rows.push({ team, season: season.replace(/[–—]/g, "-") });
      }
    }
    out[slug] = { name: c.name, leagues: c.leagues, rows };
    console.log(`${i}/${todo.length} ${c.name}: ${rows.length} team-seasons`);
  } catch { console.log(`${i}/${todo.length} ${c.name}: fetch failed`); }
  if (i % 25 === 0) writeFileSync("src/lib/coach-records.json", JSON.stringify(out));
  await sleep(3000);
}
writeFileSync("src/lib/coach-records.json", JSON.stringify(out));
console.log(`\nDone. ${Object.keys(out).length} coaches with records.`);