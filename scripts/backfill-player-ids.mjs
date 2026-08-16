import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Referer: "https://www.nba.com/", "x-nba-stats-origin": "stats", "x-nba-stats-token": "true", Accept: "application/json",
};
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

let state = { done: [], map: {}, names: {}, meta: {} };
try { state = JSON.parse(readFileSync("src/lib/nba-player-ids.json", "utf8")); state.meta ??= {}; } catch {}
const done = new Set(state.done);

const index = JSON.parse(readFileSync("src/lib/seasons/nba/index.json", "utf8"));
for (const season of index) {
  if (done.has(season)) continue;
  let ok = true;
  for (const type of ["Regular Season", "Playoffs"]) {
    const url = `https://stats.nba.com/stats/leaguegamelog?Counter=0&DateFrom=&DateTo=&Direction=DESC&LeagueID=00&PlayerOrTeam=P&Season=${encodeURIComponent(season)}&SeasonType=${encodeURIComponent(type)}&Sorter=DATE`;
    let j = null;
    for (let a = 1; a <= 3 && j === null; a++) {
      try {
        const res = await fetch(url, { headers: HEADERS });
        if (res.status === 429 || res.status === 403) { await sleep(25000 * a); continue; }
        if (!res.ok) break;
        j = await res.json();
      } catch { await sleep(15000 * a); }
    }
    if (!j) { ok = false; break; }
    const rs = j?.resultSets?.[0];
    const h = rs?.headers ?? [];
    const c = (n) => h.indexOf(n);
    for (const r of rs?.rowSet ?? []) {
      const pidNba = String(r[c("PLAYER_ID")]);
      const gameId = String(r[c("GAME_ID")]);
      state.map[`${gameId}|${norm(r[c("PLAYER_NAME")])}`] = pidNba;
      state.names[pidNba] = r[c("PLAYER_NAME")];
      const m = (state.meta[pidNba] ??= { first: season, last: season, games: 0 });
      m.games++;
      if (season < m.first) m.first = season;
      if (season > m.last) m.last = season;
    }
    await sleep(1200);
  }
  if (!ok) { console.log(`Stopping at ${season} — rerun to resume.`); break; }
  state.done = [...new Set([...state.done, season])].sort();
  writeFileSync("src/lib/nba-player-ids.json", JSON.stringify(state));
  console.log(`${season} ✓`);
}
console.log(`Done. ${Object.keys(state.names).length} unique players identified.`);