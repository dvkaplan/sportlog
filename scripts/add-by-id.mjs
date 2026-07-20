import { writeFileSync, readFileSync } from "fs";

const BASE = "https://www.thesportsdb.com/api/v1/json/3";

const IDS = [
  "135280", // St. Louis Cardinals
  "133636", // West Ham United
  "133599", // Wolverhampton Wanderers
  "133720", // Nottingham Forest
  "133623", // Burnley
  "147062", // St. Louis City SC
  "134700", // Girona
  "133733", // Mallorca
  "135455", // Real Oviedo
  "133655", // Wolfsburg
  "133813", // St Pauli
  "134696", // Heidenheim
  "134784", // Hellas Verona
  "133859", // Pisa
  "134224", // Cremonese
  "133861", // Nantes
  "133883", // Metz
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const seen = new Set(all.map((t) => t.idTeam));
console.log(`Starting from ${all.length} teams`);

for (const id of IDS) {
  if (seen.has(id)) { console.log(`${id}: already have it`); continue; }
  try {
    const res = await fetch(`${BASE}/lookupteam.php?id=${id}`);
    const json = await res.json();
    const t = json?.teams?.[0];
    if (!t) { console.log(`${id}: not found`); continue; }
    seen.add(t.idTeam);
    all.push({
      idTeam: t.idTeam,
      strTeam: t.strTeam,
      strLeague: t.strLeague ?? null,
      strSport: t.strSport ?? null,
      strBadge: t.strBadge ?? t.strTeamBadge ?? null,
      strAlternate: t.strTeamAlternate ?? t.strAlternate ?? null,
    });
    console.log(`${id}: ✓ ${t.strTeam} (${t.strLeague})`);
  } catch { console.log(`${id}: fetch failed`); }
  await sleep(1500);
}

writeFileSync("src/lib/teams.json", JSON.stringify(all, null, 2));
console.log(`\nDone. ${all.length} teams total.`);