import { writeFileSync, readFileSync, mkdirSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const ALLOWED = new Set([
  "NBA", "NFL", "MLB", "NHL",
  "English Premier League", "American Major League Soccer",
  "Spanish La Liga", "German Bundesliga", "Italian Serie A", "French Ligue 1",
]);

const QUERIES = [
  // NBA
  "Hawks","Celtics","Brooklyn Nets","Hornets","Chicago Bulls","Cavaliers","Mavericks","Nuggets","Pistons","Golden State","Rockets","Pacers","Clippers","Los Angeles Lakers","Grizzlies","Miami Heat","Bucks","Timberwolves","Pelicans","Knicks","Thunder","Orlando Magic","76ers","Phoenix Suns","Trail Blazers","Sacramento Kings","Spurs","Raptors","Utah Jazz","Wizards",
  // NFL
  "Arizona Cardinals","Falcons","Ravens","Buffalo Bills","Carolina Panthers","Chicago Bears","Bengals","Cleveland Browns","Cowboys","Broncos","Detroit Lions","Packers","Texans","Colts","Jaguars","Chiefs","Raiders","Chargers","Los Angeles Rams","Dolphins","Vikings","Patriots","New Orleans Saints","New York Giants","New York Jets","Eagles","Steelers","49ers","Seahawks","Buccaneers","Tennessee Titans","Commanders",
  // MLB
  "Diamondbacks","Atlanta Braves","Orioles","Red Sox","Chicago Cubs","White Sox","Cincinnati Reds","Guardians","Colorado Rockies","Detroit Tigers","Astros","Royals","Los Angeles Angels","Dodgers","Marlins","Brewers","Minnesota Twins","New York Mets","Yankees","Athletics","Phillies","Pirates","Padres","San Francisco Giants","Mariners","Louis Cardinals","Tampa Bay Rays","Texas Rangers","Blue Jays","Nationals",
  // NHL
  "Anaheim Ducks","Boston Bruins","Sabres","Calgary Flames","Hurricanes","Blackhawks","Avalanche","Blue Jackets","Dallas Stars","Red Wings","Oilers","Florida Panthers","Los Angeles Kings","Minnesota Wild","Canadiens","Predators","New Jersey Devils","Islanders","New York Rangers","Senators","Flyers","Penguins","San Jose Sharks","Kraken","Louis Blues","Lightning","Maple Leafs","Utah","Canucks","Golden Knights","Capitals","Winnipeg Jets",
  // EPL
  "Arsenal","Aston Villa","Bournemouth","Brentford","Brighton","Burnley","Chelsea","Crystal Palace","Everton","Fulham","Leeds","Liverpool","Manchester City","Manchester United","Newcastle","Nottingham Forest","Sunderland","Tottenham","West Ham","Wolverhampton",
  // MLS
  "Atlanta United","Austin FC","Montreal","Charlotte FC","Chicago Fire","Colorado Rapids","Columbus Crew","DC United","Cincinnati","FC Dallas","Houston Dynamo","Inter Miami","LA Galaxy","Los Angeles FC","Minnesota United","Nashville","New England Revolution","New York City FC","Red Bulls","Orlando City","Philadelphia Union","Portland Timbers","Real Salt Lake","San Diego","San Jose Earthquakes","Seattle Sounders","Sporting Kansas","Louis City","Toronto FC","Vancouver Whitecaps",
  // La Liga
  "Alaves","Athletic Bilbao","Atletico Madrid","Barcelona","Real Betis","Celta","Elche","Espanyol","Getafe","Girona","Levante","Mallorca","Osasuna","Oviedo","Rayo","Real Madrid","Real Sociedad","Sevilla","Valencia","Villarreal",
  // Bundesliga
  "Bayern","Dortmund","Leipzig","Leverkusen","Eintracht","Stuttgart","Gladbach","Wolfsburg","Freiburg","Mainz","Augsburg","Werder","Union Berlin","Hoffenheim","Heidenheim","St Pauli","Hamburg","Cologne","Koln",
  // Serie A
  "Milan","Inter","Juventus","Napoli","Roma","Lazio","Atalanta","Fiorentina","Bologna","Torino","Udinese","Genoa","Cagliari","Verona","Como","Lecce","Parma","Sassuolo","Pisa","Cremonese",
  // Ligue 1
  "Paris","Marseille","Lyon","Monaco","Lille","Nice","Lens","Rennes","Strasbourg","Nantes","Toulouse","Brest","Auxerre","Angers","Le Havre","Metz","Lorient",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Start from what we already have, so nothing is lost
let all = [];
const seen = new Set();
try {
  all = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
  for (const t of all) seen.add(t.idTeam);
  console.log(`Starting from existing file: ${all.length} teams`);
} catch { console.log("Starting fresh."); }

const missed = [];

for (let i = 0; i < QUERIES.length; i++) {
  const q = QUERIES[i];
  let added = 0;
  let teams = null;
  for (let attempt = 1; attempt <= 2 && teams === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(q)}`);
      const json = await res.json();
      teams = json?.teams ?? null;
      if (teams === null && attempt < 2) await sleep(8000);
    } catch { if (attempt < 2) await sleep(8000); }
  }
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
  if (added === 0 && (teams ?? []).length === 0) missed.push(q);
  console.log(`${i + 1}/${QUERIES.length} ${q}: +${added}`);
  await sleep(2400);
}

mkdirSync("src/lib", { recursive: true });
writeFileSync("src/lib/teams.json", JSON.stringify(all, null, 2));
console.log(`\nDone. ${all.length} teams total in src/lib/teams.json`);
if (missed.length) console.log(`Missed queries (tell Claude these): ${missed.join(", ")}`);