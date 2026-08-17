import { writeFileSync } from "fs";

const URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";

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

console.log("Downloading nflverse players master…");
const res = await fetch(URL, { redirect: "follow" });
if (!res.ok) { console.log(`FAILED: HTTP ${res.status} — paste this to Claude`); process.exit(1); }
const rows = parseCSV(await res.text());
const head = rows[0].map((h) => h.trim().toLowerCase());
const find = (...cands) => { for (const c of cands) { const i = head.indexOf(c); if (i >= 0) return i; } return -1; };

const iId = find("gsis_id", "player_id", "gsis");
const iName = find("display_name", "player_name", "full_name", "name");
const iPos = find("position", "position_group", "pos");
const iFirstYr = find("entry_year", "rookie_year", "rookie_season", "first_season");
const iLastYr = find("last_season", "latest_season", "season");
const iTeam = find("latest_team", "team_abbr", "current_team_id", "team");

if (iId < 0 || iName < 0) {
  console.log("⚠ Couldn't locate id/name columns. HEADER DUMP (paste to Claude):");
  console.log(rows[0].join(" | "));
  process.exit(1);
}

const state = { names: {}, meta: {} };
let n = 0;
for (const r of rows.slice(1)) {
  const gsis = (r[iId] ?? "").trim();
  const name = (r[iName] ?? "").trim();
  if (!gsis || !name) continue;
  state.names[gsis] = name;
  state.meta[gsis] = {
    pos: iPos >= 0 ? (r[iPos] ?? "").trim() : "",
    first: iFirstYr >= 0 ? (r[iFirstYr] ?? "").trim() : "",
    last: iLastYr >= 0 ? (r[iLastYr] ?? "").trim() : "",
    team: iTeam >= 0 ? (r[iTeam] ?? "").trim() : "",
  };
  n++;
}
writeFileSync("src/lib/nfl-player-ids.json", JSON.stringify(state));
console.log(`Universe: ${n} NFL players (columns used — id:${head[iId]} name:${head[iName]} pos:${head[iPos] ?? "—"} years:${head[iFirstYr] ?? "—"}→${head[iLastYr] ?? "—"} team:${head[iTeam] ?? "—"}).`);