import { readFileSync } from "fs";
const hist = JSON.parse(readFileSync("src/lib/fight-histories.json", "utf8"));
const rec = JSON.parse(readFileSync("src/lib/roster-records.json", "utf8"));
const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
let roster = [];
try { roster = JSON.parse(readFileSync("src/lib/ufc-roster.json", "utf8")); } catch {}
const all = [...curated, ...roster.map((r) => ({ slug: r.slug, name: r.name }))];

let missing = 0, mismatch = 0;
for (const { slug, name } of all) {
  const fights = hist[slug] ?? [];
  const listed = rec[slug] ?? null;
  if (fights.length === 0) { console.log(`NO HISTORY: ${name}`); missing++; continue; }
  if (!listed) continue;
  const w = fights.filter((f) => f.result === "W").length;
  const l = fights.filter((f) => f.result === "L").length;
  const m = listed.match(/(\d+)–(\d+)/);
  if (m && (Math.abs(w - +m[1]) > 1 || Math.abs(l - +m[2]) > 1)) {
    console.log(`MISMATCH: ${name} — history says ${w}–${l}, roster says ${listed} (${fights.length} fights parsed)`);
    mismatch++;
  }
}
console.log(`\n${missing} fighters with no history, ${mismatch} record mismatches.`);