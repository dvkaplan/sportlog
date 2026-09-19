import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", Referer: "https://www.nba.com/", "x-nba-stats-origin": "stats", "x-nba-stats-token": "true", Accept: "application/json" };
const CUTOFF = Number(process.argv[2] ?? 2000); // players whose last season is before this year
const univ = JSON.parse(readFileSync("src/lib/nba-player-ids.json", "utf8"));
mkdirSync("src/lib/nba-career", { recursive: true });
const yr = (s) => Number(String(s ?? "").slice(0, 4));
const targets = Object.entries(univ.names).filter(([id]) => { const m = univ.meta?.[id]; return m && yr(m.last) && yr(m.last) < CUTOFF && !existsSync(`src/lib/nba-career/${id}.json`); });
console.log(`${targets.length} pre-${CUTOFF} players to fetch.`);
const LABELS = ["GP", "MIN", "PTS", "REB", "AST", "STL", "BLK", "FG%", "3P%", "FT%"];
const COLS = ["GP", "MIN", "PTS", "REB", "AST", "STL", "BLK", "FG_PCT", "FG3_PCT", "FT_PCT"];
const fmt = (row, h) => COLS.map((c) => { const v = row[h.indexOf(c)]; if (v == null) return ""; return /PCT/.test(c) ? (Number(v) * 100).toFixed(1) : Number.isInteger(v) ? String(v) : Number(v).toFixed(1); });
let i = 0, ok = 0, fails = 0;
for (const [id, name] of targets) {
  i++;
  try {
    const res = await fetch(`https://stats.nba.com/stats/playercareerstats?PlayerID=${id}&PerMode=PerGame&LeagueID=00`, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) { console.log(`${i}/${targets.length} ${name}: HTTP ${res.status}`); fails++; if (++fails > 10) { console.log("Too many failures — stopping; rerun later."); break; } await sleep(5000); continue; }
    const j = await res.json();
        if (!j?.resultSets) { writeFileSync(`src/lib/nba-career/${id}.json`, JSON.stringify({ categories: [], source: "stats.nba.com", nbaId: id, empty: true })); console.log(`${i}/${targets.length} ${name}: no record at NBA (marked)`); continue; }
    const rs = (n) => j.resultSets.find((x) => x.name === n);
    const cat = (seasonSet, careerSet, label) => {
      const s = rs(seasonSet), c = rs(careerSet);
      if (!s?.rowSet?.length) return null;
      return { name: label, labels: LABELS, seasons: s.rowSet.map((r) => ({ season: r[s.headers.indexOf("SEASON_ID")], team: r[s.headers.indexOf("TEAM_ABBREVIATION")] ?? "", stats: fmt(r, s.headers) })), totals: c?.rowSet?.[0] ? fmt(c.rowSet[0], c.headers) : [] };
    };
    const categories = [cat("SeasonTotalsRegularSeason", "CareerTotalsRegularSeason", "Regular season"), cat("SeasonTotalsPostSeason", "CareerTotalsPostSeason", "Playoffs")].filter(Boolean);
    writeFileSync(`src/lib/nba-career/${id}.json`, JSON.stringify({ categories, source: "stats.nba.com", nbaId: id }));
    ok++; fails = 0;
    if (i % 25 === 0) console.log(`${i}/${targets.length} … ${ok} saved`);
  } catch { console.log(`${i}/${targets.length} ${name}: network fail`); }
  await sleep(1200);
}
console.log(`\nDone: ${ok} players saved to src/lib/nba-career/.`);