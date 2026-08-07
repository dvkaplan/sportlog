import { writeFileSync, mkdirSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Referer: "https://www.nba.com/",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
  Accept: "application/json",
};
const seasonStr = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

mkdirSync("src/lib/seasons/nba", { recursive: true });
let index = [];
try { index = JSON.parse(readFileSync("src/lib/seasons/nba/index.json", "utf8")); } catch {}
const done = new Set(index);

const START = 1946, END = new Date().getFullYear();
for (let y = END; y >= START; y--) {
  const season = seasonStr(y);
  if (done.has(season)) continue;
  const games = {};
  let ok = true;
  for (const type of ["Regular Season", "Playoffs"]) {
    const url = `https://stats.nba.com/stats/leaguegamelog?Counter=0&DateFrom=&DateTo=&Direction=DESC&LeagueID=00&PlayerOrTeam=T&Season=${encodeURIComponent(season)}&SeasonType=${encodeURIComponent(type)}&Sorter=DATE`;
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) { console.log(`${season} ${type}: HTTP ${res.status}`); ok = false; break; }
      const j = await res.json();
      const rs = j?.resultSets?.[0];
      const h = rs?.headers ?? [];
      const c = (n) => h.indexOf(n);
      for (const r of rs?.rowSet ?? []) {
        const gid = r[c("GAME_ID")];
        const matchup = r[c("MATCHUP")] ?? ""; // "LAL @ BOS" away perspective, "LAL vs. BOS" home
        const isAway = matchup.includes("@");
        const team = r[c("TEAM_NAME")], pts = r[c("PTS")], date = r[c("GAME_DATE")];
        games[gid] ??= { id: `nba-${date?.slice(0, 4)}-${gid}`, date, type: type === "Playoffs" ? "PO" : "REG", home: null, away: null, hs: null, as: null };
        const g = games[gid];
        if (isAway) { g.away = team; g.as = pts; } else { g.home = team; g.hs = pts; }
      }
      await sleep(1500);
    } catch (e) { console.log(`${season} ${type}: network fail`); ok = false; break; }
  }
  if (!ok) { console.log(`Stopping at ${season} — paste the HTTP line to Claude.`); break; }
  const arr = Object.values(games).filter((g) => g.home && g.away);
  writeFileSync(`src/lib/seasons/nba/${season}.json`, JSON.stringify(arr));
  index = [...new Set([...index, season])].sort();
  writeFileSync("src/lib/seasons/nba/index.json", JSON.stringify(index));
  console.log(`${season}: ${arr.length} games ✓`);
}
console.log("Done (or stopped).");