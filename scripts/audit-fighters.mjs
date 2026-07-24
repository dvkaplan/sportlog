import { readFileSync } from "fs";
const hist = JSON.parse(readFileSync("src/lib/fight-histories.json", "utf8"));
const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
let roster = [];
try { roster = JSON.parse(readFileSync("src/lib/ufc-roster.json", "utf8")); } catch {}
const all = [...curated, ...roster.map((r) => ({ slug: r.slug, name: r.name }))];

let missing = 0, broken = 0;
for (const { slug, name } of all) {
  const fights = hist[slug] ?? [];
  if (fights.length === 0) { console.log(`NO HISTORY: ${name} (${slug})`); missing++; continue; }
  const w = fights.filter((f) => f.result === "W").length;
  const l = fights.filter((f) => f.result === "L").length;
  // find the row with the highest total in its record cell = the latest running record
  let best = null;
  for (const f of fights) {
    const m = (f.record ?? "").match(/(\d+)[–-](\d+)/);
    if (m && (!best || +m[1] + +m[2] > best.t)) best = { w: +m[1], l: +m[2], t: +m[1] + +m[2] };
  }
  if (best && (Math.abs(w - best.w) > 1 || Math.abs(l - best.l) > 1)) {
    console.log(`BROKEN PARSE: ${name} (${slug}) — computed ${w}–${l}, table's own record says ${best.w}–${best.l} (${fights.length} rows)`);
    broken++;
  }
}
console.log(`\n${missing} fighters with no history, ${broken} genuinely broken parses.`);