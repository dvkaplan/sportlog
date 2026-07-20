import { writeFileSync, readFileSync } from "fs";

const BASE = "https://www.thesportsdb.com/api/v1/json/3";
const ALLOWED = new Set([
  "NBA","NFL","MLB","NHL",
  "English Premier League","American Major League Soccer",
  "Spanish La Liga","German Bundesliga","Italian Serie A","French Ligue 1",
]);

const QUERIES = [
  "St Louis Cardinals","Saint Louis Cardinals","St. Louis Cardinals",
  "West Ham United","Wolverhampton Wanderers","Nottingham Forest","Burnley",
  "St Louis City","St. Louis City SC",
  "Girona","Mallorca","Real Oviedo",
  "Wolfsburg","St Pauli","Heidenheim",
  "Hellas Verona","Pisa","Cremonese",
  "Paris Saint Germain","Paris Saint-Germain","Nantes","Metz",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const all = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const seen = new Set(all.map((t) => t.idTeam));
console.log(`Starting from ${all.length} teams`);

for (let i = 0; i < QUERIES.length; i++) {
  const q = QUERIES[i];
  let teams = [];
  try {
    const res = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(q)}`);
    const json = await res.json();
    teams = json?.teams ?? [];
  } catch {}
  let added = 0;
  for (const t of teams) {
    if (!ALLOWED.has(t.strLeague)) continue;
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
  console.log(`${i + 1}/${QUERIES.length} ${q}: +${added} ${added > 0 ? "→ " + teams.filter(t=>ALLOWED.has(t.strLeague)).map(t=>t.strTeam).join(", ") : ""}`);
  await sleep(2000);
}

writeFileSync("src/lib/teams.json", JSON.stringify(all, null, 2));
console.log(`\nDone. ${all.length} teams total.`);