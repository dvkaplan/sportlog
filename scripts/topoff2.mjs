import { writeFileSync, readFileSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const ALLOWED = new Set([
  "NBA","NFL","MLB","NHL",
  "English Premier League","American Major League Soccer",
  "Spanish La Liga","German Bundesliga","Italian Serie A","French Ligue 1",
]);
const IMPOSTORS = new Set(["Coventry City","Deportivo de A Coruña","Frosinone","Le Mans"]);

const QUERIES = [
  "Cardinals",                     // catches St. Louis Cardinals (MLB)
  "West Ham","Wolves","Wolverhampton","Nottingham","Burnley FC","Burnley",
  "St. Louis City SC","Saint Louis City",
  "Girona FC","Real Mallorca","Oviedo",
  "Wolfsburg","Pauli","Heidenheim 1846",
  "Hellas","Pisa Sporting","Cremonese",
  "PSG","Saint-Germain","Nantes","Metz",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let all = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const before = all.length;
all = all.filter((t) => !IMPOSTORS.has(t.strTeam));
console.log(`Pruned ${before - all.length} impostors. Starting from ${all.length} teams.`);
const seen = new Set(all.map((t) => t.idTeam));

for (let i = 0; i < QUERIES.length; i++) {
  const q = QUERIES[i];
  let teams = null;
  for (let attempt = 1; attempt <= 3 && teams === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(q)}`);
      const json = await res.json();
      teams = json?.teams ?? null;
      if (teams === null && attempt < 3) await sleep(10000);
    } catch { if (attempt < 3) await sleep(10000); }
  }
  let added = 0;
  for (const t of teams ?? []) {
    if (!ALLOWED.has(t.strLeague)) continue;
    if (IMPOSTORS.has(t.strTeam)) continue;
    if (seen.has(t.idTeam)) continue;
    seen.add(t.idTeam);
    all.push({
      idTeam: t.idTeam,
      strTeam: t.strTeam,
      strLeague: t.strLeague ?? null,
      strSport: t.strSport ?? null,
      strBadge: t.strBadge ?? t.strTeamBadge ?? null,
      strAlternate: t.strTeamAlternate ?? t.strAlternate ?? null,
    });
    added++;
  }
  console.log(`${i + 1}/${QUERIES.length} ${q}: +${added}`);
  await sleep(4000);
}

writeFileSync("src/lib/teams.json", JSON.stringify(all, null, 2));
console.log(`\nDone. ${all.length} teams total.`);