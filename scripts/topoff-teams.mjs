import { writeFileSync, readFileSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const ALLOWED = new Set([
  "NBA","NFL","MLB","NHL",
  "English Premier League","American Major League Soccer",
  "Spanish La Liga","German Bundesliga","Italian Serie A","French Ligue 1",
]);

const QUERIES = [
  // NBA (9 missing)
  "Houston Rockets","Los Angeles Clippers","Memphis Grizzlies","Milwaukee Bucks","New Orleans Pelicans","Oklahoma City Thunder","San Antonio Spurs","Toronto Raptors","Washington Wizards",
  // NFL (14 missing)
  "Green Bay Packers","Indianapolis Colts","Jacksonville Jaguars","Kansas City Chiefs","Las Vegas Raiders","Los Angeles Chargers","Miami Dolphins","Minnesota Vikings","New England Patriots","Philadelphia Eagles","Pittsburgh Steelers","San Francisco 49ers","Seattle Seahawks","Tampa Bay Buccaneers",
  // MLB (5 missing)
  "Houston Astros","Kansas City Royals","Pittsburgh Pirates","Seattle Mariners","St. Louis Cardinals","St Louis Cardinals",
  // NHL (9 missing)
  "Edmonton Oilers","Nashville Predators","New York Islanders","Philadelphia Flyers","Pittsburgh Penguins","Tampa Bay Lightning","Utah Mammoth","Utah Hockey Club","Vegas Golden Knights","Washington Capitals",
  // EPL
  "Tottenham Hotspur","West Ham United","Wolverhampton Wanderers","Newcastle United","Nottingham Forest","Leeds United","Burnley",
  // MLS
  "St. Louis City","St Louis City SC","San Diego FC","Nashville SC",
  // La Liga
  "Girona","RCD Mallorca","Mallorca","Rayo Vallecano","Real Oviedo",
  // Bundesliga
  "RB Leipzig","FC St. Pauli","St. Pauli","1. FC Heidenheim","Heidenheim","VfL Wolfsburg",
  // Serie A
  "Hellas Verona","Verona","AC Pisa","Pisa","US Cremonese","Cremonese",
  // Ligue 1
  "Paris Saint-Germain","Paris FC","FC Nantes","FC Metz",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const all = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const seen = new Set(all.map((t) => t.idTeam));
console.log(`Starting from ${all.length} teams`);

for (let i = 0; i < QUERIES.length; i++) {
  const q = QUERIES[i];
  let teams = null;
  for (let attempt = 1; attempt <= 3 && teams === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(q)}`);
      const json = await res.json();
      teams = json?.teams ?? null;
      if (teams === null && attempt < 3) await sleep(8000);
    } catch { if (attempt < 3) await sleep(8000); }
  }
  let added = 0;
  for (const t of teams ?? []) {
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
  console.log(`${i + 1}/${QUERIES.length} ${q}: +${added}`);
  await sleep(2400);
}

writeFileSync("src/lib/teams.json", JSON.stringify(all, null, 2));
console.log(`\nDone. ${all.length} teams total.`);