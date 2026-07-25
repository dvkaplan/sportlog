import { writeFileSync, readFileSync } from "fs";

const slugify = (n) =>
  (n ?? "").toLowerCase()
    .replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d")
    .replace(/æ/g, "ae").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PAIR_ALIASES = {
  "quinton-jackson": "quinton-rampage-jackson",
  "rampage-jackson": "quinton-rampage-jackson",
  "mauricio-rua": "shogun-rua",
  "mauricio-shogun-rua": "shogun-rua",
  "mirko-filipovic": "mirko-cro-cop",
  "minotauro-nogueira": "antonio-rodrigo-nogueira",
  "b-j-penn": "bj-penn",
};
const canonName = (n) => { const s = slugify(n); return PAIR_ALIASES[s] ?? s; };
const toTime = (d) => { const t = Date.parse(d); return isNaN(t) ? null : t; };

const games = JSON.parse(readFileSync("src/lib/fight-games.json", "utf8"));
const stats = JSON.parse(readFileSync("src/lib/fight-stats.json", "utf8"));

// Group by canonical pair
const byPair = {};
for (const g of games) {
  const [a, b] = (g.title ?? "").split(" vs ").map((s) => canonName((s ?? "").trim()));
  if (!a || !b) continue;
  const key = [a, b].sort().join("|");
  (byPair[key] ??= []).push(g);
}

const redirects = {};
const dead = new Set();
const WINDOW = 21 * 86400000; // 21 days: generous for timezone + reporting drift

for (const group of Object.values(byPair)) {
  if (group.length < 2) continue;
  // sort: stats-rich first, then keep clustering by date
  const enriched = group.map((g) => ({ g, t: toTime(g.date), hasStats: !!stats[g.id] }));
  for (const item of enriched.filter((x) => !x.hasStats)) {
    if (dead.has(item.g.id)) continue;
    // find a stats-rich sibling within the window (or with no parseable date on either side)
    const survivor = enriched.find(
      (x) =>
        x.hasStats && !dead.has(x.g.id) &&
        (item.t === null || x.t === null || Math.abs(x.t - item.t) <= WINDOW)
    );
    if (survivor) {
      redirects[item.g.id] = survivor.g.id;
      dead.add(item.g.id);
    }
  }
}

const kept = games.filter((g) => !dead.has(g.id));
writeFileSync("src/lib/fight-games.json", JSON.stringify(kept));
writeFileSync("src/lib/fight-redirects.json", JSON.stringify(redirects));
console.log(`Merged ${dead.size} twin fights. ${kept.length} fights remain. Redirect map written.`);