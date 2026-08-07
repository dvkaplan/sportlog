import { writeFileSync, readFileSync } from "fs";

const slugify = (n) =>
  (n ?? "")
    .toLowerCase()
    .replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d")
    .replace(/æ/g, "ae").replace(/ß/g, "ss").replace(/þ/g, "th")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// "UFC 264: Poirier vs. McGregor 3" and "UFC 264" → same canonical key
const CORE = /^((?:UFC(?:\s+Fight\s+Night)?|Bellator|PRIDE|Strikeforce|Invicta FC|PFL|WEC|Rizin|ONE(?:\s+Championship)?|K-1)\s*#?\s*\d+[a-z]?)/i;
const canonical = (name) => {
  const m = (name ?? "").match(CORE);
  return m ? m[1].replace(/\s+/g, " ").trim() : (name ?? "").trim();
};

const stats = JSON.parse(readFileSync("src/lib/fight-stats.json", "utf8"));
const games = JSON.parse(readFileSync("src/lib/fight-games.json", "utf8"));
const gameById = Object.fromEntries(games.map((g) => [g.id, g]));

const events = {};
const addFight = (rawName, fight, date) => {
  const core = canonical(rawName);
  if (!core) return;
  const slug = slugify(core);
  events[slug] ??= { slug, name: core, fullName: rawName, date: date ?? "", fights: [], seen: new Set() };
  const e = events[slug];
  if ((rawName ?? "").length > (e.fullName ?? "").length) e.fullName = rawName; // keep richest title
  if (!e.date && date) e.date = date;
  const pairKey = (fight.title ?? "")
    .split(" vs ")
    .map((s) => slugify(s.trim()).replace(/-(jr|sr|ii|iii|iv|v)$/i, ""))
    .sort()
    .join("|");
  if (e.seen.has(fight.gameId) || (pairKey && e.seen.has(pairKey))) return;
  e.seen.add(fight.gameId);
  if (pairKey) e.seen.add(pairKey);
  e.fights.push(fight);
};

for (const [gameId, fs] of Object.entries(stats)) {
  const g = gameById[gameId];
  addFight(fs.event, {
    gameId,
    title: g?.title ?? `${fs.fighters?.[0]?.name ?? ""} vs ${fs.fighters?.[1]?.name ?? ""}`,
    weightclass: fs.weightclass ?? "", method: fs.method ?? "",
    round: fs.round ?? "", time: fs.time ?? "", order: fs.order ?? 9999, result: g?.score ?? "",
  }, g?.date ?? "");
}
for (const g of games) {
  if (stats[g.id]) continue;
  if (!(g.blurb ?? "").trim()) continue;
  addFight(g.blurb, {
    gameId: g.id, title: g.title, weightclass: "", method: "", round: "", time: "", order: 9999, result: g.score ?? "",
  }, g.date ?? "");
}

const arr = Object.values(events)
  .filter((e) => e.fights.length > 0)
  .map(({ seen, fullName, ...e }) => ({
    ...e,
    name: fullName || e.name,
    fights: [...e.fights].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.title.localeCompare(b.title)),
  }));
writeFileSync("src/lib/events.json", JSON.stringify(arr));
console.log(`Built ${arr.length} merged event pages covering ${arr.reduce((s, e) => s + e.fights.length, 0)} fights.`);