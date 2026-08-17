import { readFileSync, writeFileSync, readdirSync } from "fs";

const slug = (n) => (n ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
const iso = (d) => {
  const m = (d ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : d ?? "";
};
const TYPE = (wk, playoff) => {
  const w = (wk ?? "").toLowerCase();
  if (w.includes("wildcard") || w.includes("wild card")) return "WC";
  if (w.includes("division")) return "DIV";
  if (w.includes("conference")) return "CON";
  if (w.includes("superbowl") || w.includes("super bowl")) return "SB";
  if (playoff === "TRUE" || playoff === "true") return "CHAMP";
  return "REG";
};

const existing = new Set(readdirSync("src/lib/seasons/nfl").filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.replace(".json", "")));
const rows = parseCSV(readFileSync("spreadspoke_scores.csv", "utf8"));
const head = rows[0];
const c = (n) => head.indexOf(n);
const iDate = c("schedule_date"), iSeason = c("schedule_season"), iWeek = c("schedule_week"),
  iPO = c("schedule_playoff"), iH = c("team_home"), iHS = c("score_home"), iAS = c("score_away"), iA = c("team_away");

const bySeason = {};
for (const r of rows.slice(1)) {
  const season = r[iSeason];
  if (!season || Number(season) >= 1999 || Number(season) < 1966) continue;
  if (existing.has(season)) continue;
  const type = TYPE(r[iWeek], r[iPO]);
  const week = type === "REG" ? String(r[iWeek]).trim() : r[iWeek];
  const g = {
    id: `nfl-${season}-${slug(r[iA])}-at-${slug(r[iH])}-${slug(String(r[iWeek]))}`,
    week: type === "REG" ? week : "",
    type,
    date: iso(r[iDate]),
    away: r[iA], home: r[iH],
    as: r[iAS] === "" ? null : Number(r[iAS]),
    hs: r[iHS] === "" ? null : Number(r[iHS]),
    ot: false,
  };
  (bySeason[season] ??= []).push(g);
}

let total = 0;
for (const [season, games] of Object.entries(bySeason)) {
  // dedupe by id (double-listings guard)
  const seen = new Set();
  const clean = games.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)));
  writeFileSync(`src/lib/seasons/nfl/${season}.json`, JSON.stringify(clean));
  total += clean.length;
  console.log(`${season}: ${clean.length} games ✓`);
}
const index = [...new Set([...JSON.parse(readFileSync("src/lib/seasons/nfl/index.json", "utf8")), ...Object.keys(bySeason)])].sort();
writeFileSync("src/lib/seasons/nfl/index.json", JSON.stringify(index));
console.log(`\nWrote ${total} legacy games across ${Object.keys(bySeason).length} seasons (1966–1998).`);