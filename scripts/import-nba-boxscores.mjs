import { writeFileSync, readFileSync, mkdirSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Referer: "https://www.nba.com/",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
  Accept: "application/json",
};
const nick = (n) => (n ?? "").trim().split(/\s+/).pop().toLowerCase();
const dash = (m, a) => (a == null ? null : `${m ?? 0}-${a}`);

// Full modern column set; each defines how to build its cell and whether the era recorded it
const COLS = [
  { label: "MIN", cell: (r, c) => r[c("MIN")], has: (r, c) => r[c("MIN")] != null },
  { label: "PTS", cell: (r, c) => r[c("PTS")], has: (r, c) => r[c("PTS")] != null },
  { label: "FG", cell: (r, c) => dash(r[c("FGM")], r[c("FGA")]), has: (r, c) => r[c("FGA")] != null },
  { label: "3PT", cell: (r, c) => dash(r[c("FG3M")], r[c("FG3A")]), has: (r, c) => r[c("FG3A")] != null },
  { label: "FT", cell: (r, c) => dash(r[c("FTM")], r[c("FTA")]), has: (r, c) => r[c("FTA")] != null },
  { label: "REB", cell: (r, c) => r[c("REB")], has: (r, c) => r[c("REB")] != null },
  { label: "AST", cell: (r, c) => r[c("AST")], has: (r, c) => r[c("AST")] != null },
  { label: "TO", cell: (r, c) => r[c("TO")], has: (r, c) => r[c("TO")] != null },
  { label: "STL", cell: (r, c) => r[c("STL")], has: (r, c) => r[c("STL")] != null },
  { label: "BLK", cell: (r, c) => r[c("BLK")], has: (r, c) => r[c("BLK")] != null },
  { label: "OREB", cell: (r, c) => r[c("OREB")], has: (r, c) => r[c("OREB")] != null },
  { label: "DREB", cell: (r, c) => r[c("DREB")], has: (r, c) => r[c("DREB")] != null },
  { label: "PF", cell: (r, c) => r[c("PF")], has: (r, c) => r[c("PF")] != null },
  { label: "+/-", cell: (r, c) => r[c("PLUS_MINUS")], has: (r, c) => r[c("PLUS_MINUS")] != null },
];

mkdirSync("src/lib/boxscores/nba", { recursive: true });
const index = JSON.parse(readFileSync("src/lib/seasons/nba/index.json", "utf8"));
const seasons = index.filter((s) => Number(s.slice(0, 4)) <= 2001).sort().reverse();

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
        console.log(`\n⛔ 5 straight failures — rate limiter cooling you off. Progress saved; rerun in ~an hour to resume.`);
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
      out[g.id] = { unavailable: true };
    } else {
      const h = ps.headers;
      const c = (name) => h.indexOf(name);
      const active = COLS.filter((col) => ps.rowSet.some((r) => col.has(r, c)));
      const byTeam = {};
      for (const r of ps.rowSet) {
        const team = `${r[c("TEAM_CITY")] ?? ""} ${r[c("TEAM_NICKNAME")] ?? r[c("TEAM_ABBREVIATION")] ?? ""}`.trim();
        (byTeam[team] ??= []).push(r);
      }
      const groups = Object.entries(byTeam).map(([team, rows]) => ({
        title: team,
        columns: active.map((col) => col.label),
        rows: rows
          .filter((r) => r[c("COMMENT")] === "" || r[c("COMMENT")] == null)
          .map((r) => ({
            name: r[c("PLAYER_NAME")] ?? "",
            cells: active.map((col) => {
              const v = col.cell(r, c);
              return v === null || v === undefined || v === "" ? "—" : v;
            }),
          })),
      }));
      groups.sort((a, b) => (nick(a.title) === nick(g.away) ? -1 : nick(b.title) === nick(g.away) ? 1 : 0));

      const teamStats = [];
      if (ts?.rowSet?.length === 2) {
        const th = ts.headers;
        const tc = (name) => th.indexOf(name);
        let [rA, rB] = ts.rowSet;
        if (nick(`${rB[tc("TEAM_CITY")]} ${rB[tc("TEAM_NAME")]}`) === nick(g.away)) [rA, rB] = [rB, rA];
        const pct = (v) => (v == null ? null : `${Math.round(Number(v) * 1000) / 10}%`);
        const num = (v) => (v == null ? null : v);
        const both = (fa, fb) => fa != null || fb != null;
        const push = (label, va, vb) => { if (both(va, vb)) teamStats.push({ label, away: va ?? "—", home: vb ?? "—" }); };
        push("FG", dash(rA[tc("FGM")], rA[tc("FGA")]), dash(rB[tc("FGM")], rB[tc("FGA")]));
        push("FG%", pct(rA[tc("FG_PCT")]), pct(rB[tc("FG_PCT")]));
        push("3PT", dash(rA[tc("FG3M")], rA[tc("FG3A")]), dash(rB[tc("FG3M")], rB[tc("FG3A")]));
        push("3P%", pct(rA[tc("FG3_PCT")]), pct(rB[tc("FG3_PCT")]));
        push("FT", dash(rA[tc("FTM")], rA[tc("FTA")]), dash(rB[tc("FTM")], rB[tc("FTA")]));
        push("FT%", pct(rA[tc("FT_PCT")]), pct(rB[tc("FT_PCT")]));
        push("Rebounds", num(rA[tc("REB")]), num(rB[tc("REB")]));
        push("Offensive Rebounds", num(rA[tc("OREB")]), num(rB[tc("OREB")]));
        push("Defensive Rebounds", num(rA[tc("DREB")]), num(rB[tc("DREB")]));
        push("Assists", num(rA[tc("AST")]), num(rB[tc("AST")]));
        push("Steals", num(rA[tc("STL")]), num(rB[tc("STL")]));
        push("Blocks", num(rA[tc("BLK")]), num(rB[tc("BLK")]));
        push("Turnovers", num(rA[tc("TO")]), num(rB[tc("TO")]));
        push("Fouls", num(rA[tc("PF")]), num(rB[tc("PF")]));
        push("Points", num(rA[tc("PTS")]), num(rB[tc("PTS")]));
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
//