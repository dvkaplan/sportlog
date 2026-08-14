import { writeFileSync, readFileSync, mkdirSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Referer: "https://www.nba.com/",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
  Accept: "application/json",
};
const STAT_COLS = [["MIN", "MIN"], ["PTS", "PTS"], ["REB", "REB"], ["AST", "AST"], ["STL", "STL"], ["BLK", "BLK"]];
const nick = (n) => (n ?? "").trim().split(/\s+/).pop().toLowerCase();

mkdirSync("src/lib/boxscores/nba", { recursive: true });
const index = JSON.parse(readFileSync("src/lib/seasons/nba/index.json", "utf8"));
const seasons = index.filter((s) => Number(s.slice(0, 4)) <= 2001).sort().reverse(); // 2001-02 → 1946-47

let consecutiveFails = 0;

for (const season of seasons) {
  const games = JSON.parse(readFileSync(`src/lib/seasons/nba/${season}.json`, "utf8"));
  let out = {};
  try { out = JSON.parse(readFileSync(`src/lib/boxscores/nba/${season}.json`, "utf8")); } catch {}
  const pending = games.filter((g) => !(g.id in out));
  if (pending.length === 0) { console.log(`${season}: already complete (${games.length} games)`); continue; }
  console.log(`${season}: fetching ${pending.length} of ${games.length} box scores…`);
  let n = 0;
  for (const g of pending) {
    const gid = g.id.split("-").slice(2).join("-");
    const url = `https://stats.nba.com/stats/boxscoretraditionalv2?GameID=${gid}&StartPeriod=0&EndPeriod=10&StartRange=0&EndRange=0&RangeType=0`;
    let j = null;
    for (let a = 1; a <= 3 && j === null; a++) {
      try {
        const res = await fetch(url, { headers: HEADERS });
        if (res.status === 429 || res.status === 403) { await sleep(30000 * a); continue; }
        if (!res.ok) break;
        j = await res.json();
      } catch { await sleep(15000 * a); }
    }
    if (!j) {
      consecutiveFails++;
      if (consecutiveFails >= 5) {
        writeFileSync(`src/lib/boxscores/nba/${season}.json`, JSON.stringify(out));
        console.log(`\n⛔ 5 straight failures — NBA's rate limiter is likely cooling you off. Progress saved. Wait ~an hour and rerun; it resumes exactly here.`);
        process.exit(0);
      }
      await sleep(20000);
      continue;
    }
    consecutiveFails = 0;

    const rs = Object.fromEntries((j?.resultSets ?? []).map((r) => [r.name, r]));
    const ps = rs["PlayerStats"];
    const ts = rs["TeamStats"];
    if (!ps || !ps.rowSet?.length) {
      out[g.id] = { unavailable: true }; // honestly recorded: nothing was kept for this game
    } else {
      const h = ps.headers;
      const c = (name) => h.indexOf(name);
      const byTeam = {};
      for (const r of ps.rowSet) {
        const team = `${r[c("TEAM_CITY")] ?? ""} ${r[c("TEAM_NICKNAME")] ?? r[c("TEAM_ABBREVIATION")] ?? ""}`.trim();
        (byTeam[team] ??= []).push(r);
      }
      const activeCols = STAT_COLS.filter(([col]) =>
        ps.rowSet.some((r) => r[c(col)] !== null && r[c(col)] !== undefined && r[c(col)] !== "")
      );
      const groups = Object.entries(byTeam).map(([team, rows]) => ({
        title: team,
        columns: activeCols.map(([, label]) => label),
        rows: rows
          .filter((r) => r[c("COMMENT")] === "" || r[c("COMMENT")] == null)
          .map((r) => ({
            name: r[c("PLAYER_NAME")] ?? "",
            cells: activeCols.map(([col]) => {
              const v = r[c(col)];
              return v === null || v === undefined || v === "" ? "—" : v;
            }),
          })),
      }));
      // order groups away-first using the season file's own home/away
      groups.sort((a, b) => (nick(a.title) === nick(g.away) ? -1 : nick(b.title) === nick(g.away) ? 1 : 0));

      const teamStats = [];
      if (ts?.rowSet?.length === 2) {
        const th = ts.headers;
        const tc = (name) => th.indexOf(name);
        let [rA, rB] = ts.rowSet;
        if (nick(`${rB[tc("TEAM_CITY")]} ${rB[tc("TEAM_NAME")]}`) === nick(g.away)) [rA, rB] = [rB, rA];
        const pct = (v) => (v == null ? "—" : `${Math.round(Number(v) * 1000) / 10}%`);
        const num = (v) => (v == null ? "—" : v);
        const pushRow = (label, key, fmt) => {
          const va = fmt(rA[tc(key)]), vb = fmt(rB[tc(key)]);
          if (va !== "—" || vb !== "—") teamStats.push({ label, away: va, home: vb });
        };
        pushRow("FG%", "FG_PCT", pct);
        pushRow("3P%", "FG3_PCT", pct);
        pushRow("FT%", "FT_PCT", pct);
        pushRow("Rebounds", "REB", num);
        pushRow("Assists", "AST", num);
        pushRow("Turnovers", "TO", num);
        pushRow("Points", "PTS", num);
      }
      out[g.id] = { teamStats, groups };
    }

    n++;
    if (n % 25 === 0) {
      writeFileSync(`src/lib/boxscores/nba/${season}.json`, JSON.stringify(out));
      console.log(`  ${season}: ${Object.keys(out).length}/${games.length} saved…`);
    }
    await sleep(1400);
  }
  writeFileSync(`src/lib/boxscores/nba/${season}.json`, JSON.stringify(out));
  const empt = Object.values(out).filter((x) => x.unavailable).length;
  console.log(`${season}: ✓ ${Object.keys(out).length}/${games.length} (${empt} with no recorded sheet)`);
}
console.log("\nAll pre-2002 seasons complete.");