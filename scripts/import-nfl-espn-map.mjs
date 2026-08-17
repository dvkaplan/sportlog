import { writeFileSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const nick = (name) => (name ?? "").trim().split(/\s+/).pop().toLowerCase();
let state = { done: [], map: {} };
try { state = JSON.parse(readFileSync("src/lib/nfl-espn-map.json", "utf8")); } catch {}
const doneSeasons = new Set(state.done);

const index = JSON.parse(readFileSync("src/lib/seasons/nfl/index.json", "utf8"));
const targets = index.filter((s) => Number(s) >= 1966 && Number(s) <= 1998); // 93–98 will simply yield 0s

for (const season of targets) {
  if (doneSeasons.has(season)) continue;
  const games = JSON.parse(readFileSync(`src/lib/seasons/nfl/${season}.json`, "utf8"));
  const pending = games.filter((g) => !state.map[g.id]);
  if (pending.length === 0) { state.done.push(season); continue; }
  const byDateKey = {};
  const dates = new Set();
  for (const g of pending) {
    const d = (g.date ?? "").slice(0, 10);
    if (!d) continue;
    dates.add(d);
    byDateKey[`${d}|${[nick(g.away), nick(g.home)].sort().join("|")}`] = g.id;
  }
  let mapped = 0, failed = false;
  for (const d of [...dates].sort()) {
    const ymd = d.replace(/-/g, "");
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${ymd}&limit=100`);
      if (!res.ok) { console.log(`${season} ${d}: HTTP ${res.status}`); failed = true; break; }
      const j = await res.json();
      for (const ev of j?.events ?? []) {
        const comp = ev?.competitions?.[0];
        const names = (comp?.competitors ?? []).map((c) => nick(c?.team?.displayName));
        const key = `${d}|${[...names].sort().join("|")}`;
        const ourId = byDateKey[key];
        if (ourId) { state.map[ourId] = String(ev.id); mapped++; }
      }
      await sleep(300);
    } catch { console.log(`${season} ${d}: network fail`); failed = true; break; }
  }
  if (failed) { console.log(`Stopping mid-${season} — rerun to resume.`); break; }
  state.done = [...new Set([...state.done, season])].sort();
  writeFileSync("src/lib/nfl-espn-map.json", JSON.stringify(state));
  console.log(`${season}: mapped ${mapped}/${games.length} ✓`);
}
console.log(`\nDone. ${Object.keys(state.map).length} legacy games mapped to ESPN ids.`);