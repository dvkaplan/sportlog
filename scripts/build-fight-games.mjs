import { writeFileSync, readFileSync } from "fs";

const slugify = (n) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const PAIR_ALIASES = {
  "quinton-jackson": "quinton-rampage-jackson",
  "rampage-jackson": "quinton-rampage-jackson",
  "mauricio-rua": "shogun-rua",
  "mauricio-shogun-rua": "shogun-rua",
  "mirko-filipovic": "mirko-cro-cop",
  "minotauro-nogueira": "antonio-rodrigo-nogueira",
  "b-j-penn": "bj-penn",
  "bj-penn": "bj-penn",
};
const canonName = (n) => {
  const s = slugify(n);
  return PAIR_ALIASES[s] ?? s;
};
const dateSlug = (d) => slugify(d).slice(0, 24) || "nd";

const src = readFileSync("src/lib/fighters.ts", "utf8");
const curated = [...src.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*sport:\s*"([^"]+)"/g)]
  .map((m) => ({ slug: m[1], name: m[2], sport: m[3] }));
let roster = [];
try { roster = JSON.parse(readFileSync("src/lib/ufc-roster.json", "utf8")); } catch {}
const all = [...curated, ...roster];
const bySlug = Object.fromEntries(all.map((f) => [f.slug, f]));

const hist = JSON.parse(readFileSync("src/lib/fight-histories.json", "utf8"));

const games = {};
for (const [slug, fights] of Object.entries(hist)) {
  const me = bySlug[slug];
  if (!me) continue;
  for (const f of fights) {
    if (!f.opponent) continue;
    const pair = [canonName(me.name), canonName(f.opponent)].sort();
    const id = `fight-${pair[0]}-vs-${pair[1]}-${dateSlug(f.date)}`;
    if (games[id]) continue;
    const winner = f.result === "W" ? me.name : f.result === "L" ? f.opponent : null;
    games[id] = {
      id,
      sportSlug: me.sport === "boxing" ? "boxing" : "mma",
      league: me.sport === "boxing" ? "Pro Boxing" : "MMA",
      title: `${me.name} vs ${f.opponent}`,
      date: f.date || "",
      score: winner ? `${winner} — ${f.method || "W"}` : f.method || "",
      blurb: f.event || "",
    };
  }
}
const arr = Object.values(games);
writeFileSync("src/lib/fight-games.json", JSON.stringify(arr));
console.log(`Built ${arr.length} fight pages from ${Object.keys(hist).length} fighter histories.`);