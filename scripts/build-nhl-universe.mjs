import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let state = { done: [], names: {}, meta: {} };
try { state = JSON.parse(readFileSync("src/lib/nhl-player-ids.json", "utf8")); } catch {}
const done = new Set(state.done);

// All NHL franchise abbreviations, past and present
const TEAMS = ["ANA","ARI","ATL","BOS","BRK","BUF","CGY","CAR","CHI","CLE","COL","CBJ","DAL","DET","EDM","FLA","HAM","HFD","KCS","LAK","MIN","MNS","MTL","MMR","NSH","NJD","NYA","NYI","NYR","OAK","OTT","PHI","PHX","PIT","QUE","SEA","SJS","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG","QBD","MWN","PIR","CLR","DCG","DFL","CGS","TAN","TSP","SLE","UTM"];
const thisYear = new Date().getFullYear();
const seasons = [];
for (let y = 1917; y < thisYear; y++) seasons.push(`${y}${y + 1}`);

for (const season of seasons) {
  if (done.has(season)) continue;
  let seasonAdded = 0, hadData = false;
  for (const team of TEAMS) {
    let j = null;
    try {
      const res = await fetch(`https://api-web.nhle.com/v1/roster/${team}/${season}`);
      if (res.ok) j = await res.json();
    } catch { /* team didn't exist that season — normal */ }
    if (!j) { await sleep(120); continue; }
    hadData = true;
    for (const grp of ["forwards", "defensemen", "goalies"]) {
      for (const p of j?.[grp] ?? []) {
        const id = String(p.id);
        const name = `${p.firstName?.default ?? ""} ${p.lastName?.default ?? ""}`.trim();
        if (!state.names[id]) seasonAdded++;
        state.names[id] = name;
        const m = (state.meta[id] ??= { first: season, last: season });
        if (season < m.first) m.first = season;
        if (season > m.last) m.last = season;
      }
    }
    await sleep(150);
  }
  if (!hadData) { console.log(`${season}: no data (lockout or API gap) — marking done`); }
  state.done = [...new Set([...state.done, season])].sort();
  writeFileSync("src/lib/nhl-player-ids.json", JSON.stringify(state));
  console.log(`${season}: +${seasonAdded} new (${Object.keys(state.names).length} total)`);
}
console.log(`\nDone. ${Object.keys(state.names).length} unique NHL players.`);