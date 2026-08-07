import { writeFileSync, mkdirSync } from "fs";

const URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
const NAMES = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens", BUF: "Buffalo Bills",
  CAR: "Carolina Panthers", CHI: "Chicago Bears", CIN: "Cincinnati Bengals", CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys", DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars", KC: "Kansas City Chiefs",
  LA: "Los Angeles Rams", LAR: "Los Angeles Rams", LAC: "Los Angeles Chargers", LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins", MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints",
  NYG: "New York Giants", NYJ: "New York Jets", OAK: "Oakland Raiders", PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers", SD: "San Diego Chargers", SEA: "Seattle Seahawks", SF: "San Francisco 49ers",
  STL: "St. Louis Rams", TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans", WAS: "Washington Commanders",
};

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

console.log("Downloading nflverse games.csv…");
const res = await fetch(URL);
if (!res.ok) { console.log(`FAILED: HTTP ${res.status} — paste this to Claude`); process.exit(1); }
const rows = parseCSV(await res.text());
const head = rows[0];
const col = (name) => head.indexOf(name);
const iId = col("game_id"), iSeason = col("season"), iType = col("game_type"), iWeek = col("week"),
  iDay = col("gameday"), iAway = col("away_team"), iHome = col("home_team"),
  iAS = col("away_score"), iHS = col("home_score"), iOT = col("overtime");

const bySeason = {};
let total = 0;
for (const r of rows.slice(1)) {
  if (!r[iId]) continue;
  const season = r[iSeason];
  const g = {
    id: `nfl-${r[iId]}`,
    week: r[iWeek],
    type: r[iType], // REG, WC, DIV, CON, SB
    date: r[iDay],
    away: NAMES[r[iAway]] ?? r[iAway],
    home: NAMES[r[iHome]] ?? r[iHome],
    as: r[iAS] === "" ? null : Number(r[iAS]),
    hs: r[iHS] === "" ? null : Number(r[iHS]),
    ot: r[iOT] === "1",
  };
  (bySeason[season] ??= []).push(g);
  total++;
}

mkdirSync("src/lib/seasons/nfl", { recursive: true });
const seasons = Object.keys(bySeason).sort();
for (const s of seasons) writeFileSync(`src/lib/seasons/nfl/${s}.json`, JSON.stringify(bySeason[s]));
writeFileSync("src/lib/seasons/nfl/index.json", JSON.stringify(seasons));
console.log(`Wrote ${total} NFL games across ${seasons.length} seasons (${seasons[0]}–${seasons[seasons.length - 1]}).`);