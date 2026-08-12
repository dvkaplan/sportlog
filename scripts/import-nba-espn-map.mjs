import { writeFileSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const nick = (name) => (name ?? "").trim().split(/\s+/).pop().toLowerCase();
const state = (() => {
  try { return JSON.parse(readFileSync("src/lib/nba-espn-map.json", "utf8")); }
  catch { return { done: [], map: {} }; }
})();
const doneSeasons = new Set(state.done);

const index = JSON.parse(readFileSync("src/lib/seasons/nba/index.json", "utf8"));
const seasons = index.filter((s) => Number(s.slice(0, 4)) >= 2002); // ESPN coverage floor

for (const season of seasons) {
  if (doneSeasons.has(season)) continue;
  const games = JSON.parse(readFileSync(`src/lib/seasons/nba/${season}.json`, "utf8"));
  const byDateKey = {};
  const dates = new Set();
  for (const g of games) {
    const d = (g.date ?? "").slice(0, 10);
    if (!d) continue;
    dates.add(d);
    byDateKey[`${d}|${[nick(g.away), nick(g.home)].sort().join("|")}`] = g.id;
  }
  let mapped = 0, failed = false;
  for (const d of [...dates].sort()) {
    const ymd = d.replace(/-/g, "");
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${ymd}&limit=100`);
      if (!res.ok) { console.log(`${season} ${d}: HTTP ${res.status}`); failed = true; break; }
      const j = await res.json();
      for (const ev of j?.events ?? []) {
        const comp = ev?.competitions?.[0];
        const names = (comp?.competitors ?? []).map((c) => nick(c?.team?.displayName));
        const key = `${d}|${[...names].sort().join("|")}`;
        const ourId = byDateKey[key];
        if (ourId) { state.map[ourId] = ev.id; mapped++; }
      }
      await sleep(250);
    } catch { console.log(`${season} ${d}: network fail`); failed = true; break; }
  }
  if (failed) { console.log(`Stopping mid-${season} — rerun to resume (season not marked done).`); break; }
  state.done = [...new Set([...state.done, season])].sort();
  writeFileSync("src/lib/nba-espn-map.json", JSON.stringify(state));
  console.log(`${season}: mapped ${mapped}/${games.length} games ✓`);
}
console.log("Mapping done (or stopped).");