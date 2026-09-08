import { readFileSync } from "fs";
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

const report = JSON.parse(readFileSync("census-report.json", "utf8"));
const names = [...report.pile1_autofixable, ...report.pile2_needs_decision, ...report.pile3_no_data];

const UNIV = {};
for (const [lg, file] of [["nba","nba-player-ids.json"],["nfl","nfl-player-ids.json"],["mlb","mlb-player-ids.json"],["nhl","nhl-player-ids.json"]]) {
  try { UNIV[lg] = JSON.parse(readFileSync(`src/lib/${file}`, "utf8")); } catch { UNIV[lg] = null; }
}
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const SPORT = { nba: "Basketball", nfl: "American Football", mlb: "Baseball", nhl: "Ice Hockey" };

const autoLines = [];
for (const item of names) {
  const { name, lg, count } = item;
  console.log(`\n[${lg}] ${name} (appears ${count}×)`);
  // real players.json entries with this exact name + right sport
  const real = players.filter((p) => norm(p.strPlayer) === norm(name) && (p.strSport ?? "") === SPORT[lg]);
  for (const r of real) console.log(`  REAL: ${r.strPlayer} — id ${r.idPlayer} — team ${r.strTeam}`);
  // universe candidates with same full name
  const univHits = Object.entries(UNIV[lg]?.names ?? {}).filter(([, un]) => norm(un) === norm(name));
  for (const [uid, un] of univHits) {
    const m = UNIV[lg]?.meta?.[uid] ?? {};
    console.log(`  UNIVERSE: ${un} — override id "${lg}-${uid}" — career ${m.first ?? "?"} → ${m.last ?? "?"}${m.games ? ` — ${m.games} games` : ""}`);
  }
  if (real.length === 0 && univHits.length === 0) console.log(`  (nothing found — truly no data)`);
  const total = real.length + univHits.length;
  if (total === 1) {
    const id = real[0]?.idPlayer ?? `${lg}-${univHits[0][0]}`;
    autoLines.push(`  "${lg}|${norm(name)}": "${id}",`);
  }
}
if (autoLines.length) {
  console.log(`\n=== SINGLE-CANDIDATE OVERRIDES — paste these straight into link-overrides.json ===`);
  for (const l of autoLines) console.log(l);
}
console.log(`\nFor multi-candidate names: pick the right one by career years vs the games they appear in, and write the line yourself in the same format.`);