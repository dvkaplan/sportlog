import { readFileSync, readdirSync, writeFileSync } from "fs";
const norm = (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const LG = { NBA: "nba", NFL: "nfl", MLB: "mlb", NHL: "nhl" };
// every team name that actually appears in our season files, per league (historic names included)
const namesByLg = {}, teamsBySeason = {};
for (const lg of Object.values(LG)) {
  const set = new Set(); teamsBySeason[lg] = {};
  for (const f of readdirSync(`src/lib/seasons/${lg}`).filter((x) => /^\d{4}/.test(x))) {
    const season = f.replace(/\.json$/, ""); const sset = new Set();
    for (const g of JSON.parse(readFileSync(`src/lib/seasons/${lg}/${f}`, "utf8"))) { set.add(g.home); set.add(g.away); sset.add(g.home); sset.add(g.away); }
    teamsBySeason[lg][season] = sset;
  }
  namesByLg[lg] = [...set];
}
const ABBR = {
  nfl: { KC: "Kansas City Chiefs", PHI: "Philadelphia Eagles", NYJ: "New York Jets", NYG: "New York Giants", NE: "New England Patriots", TB: "Tampa Bay Buccaneers", OAK: "Oakland Raiders", LV: "Las Vegas Raiders", NO: "New Orleans Saints", BOS: "Boston Patriots", CAR: "Carolina Panthers", GB: "Green Bay Packers", SF: "San Francisco 49ers", LA: "Los Angeles Rams", LAR: "Los Angeles Rams", STL: "St. Louis Rams", SD: "San Diego Chargers", LAC: "Los Angeles Chargers", DAL: "Dallas Cowboys", DEN: "Denver Broncos", DET: "Detroit Lions", HOU: "Houston Texans", IND: "Indianapolis Colts", BAL: "Baltimore Ravens", JAX: "Jacksonville Jaguars", MIA: "Miami Dolphins", MIN: "Minnesota Vikings", PIT: "Pittsburgh Steelers", SEA: "Seattle Seahawks", TEN: "Tennessee Titans", WAS: "Washington Commanders", ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BUF: "Buffalo Bills", CHI: "Chicago Bears", CIN: "Cincinnati Bengals", CLE: "Cleveland Browns" },
  mlb: { LAA: "Los Angeles Angels", ANA: "Anaheim Angels", CAL: "California Angels", NYM: "New York Mets", NYY: "New York Yankees", OAK: "Oakland Athletics", CWS: "Chicago White Sox", CHW: "Chicago White Sox", CHC: "Chicago Cubs", SF: "San Francisco Giants", WSA: "Washington Senators", WSH: "Washington Nationals", LAD: "Los Angeles Dodgers", SD: "San Diego Padres", STL: "St. Louis Cardinals", TB: "Tampa Bay Rays", KC: "Kansas City Royals", ATL: "Atlanta Braves", BOS: "Boston Red Sox", HOU: "Houston Astros", TEX: "Texas Rangers", MIN: "Minnesota Twins", SEA: "Seattle Mariners", TOR: "Toronto Blue Jays", BAL: "Baltimore Orioles", CLE: "Cleveland Indians", DET: "Detroit Tigers", MIL: "Milwaukee Brewers", PIT: "Pittsburgh Pirates", CIN: "Cincinnati Reds", PHI: "Philadelphia Phillies", COL: "Colorado Rockies", ARI: "Arizona Diamondbacks", MIA: "Miami Marlins", FLA: "Florida Marlins" , SLB: "St. Louis Browns", MON: "Montreal Expos", BKN: "Brooklyn Dodgers", BOB: "Boston Braves", WSH: "Washington Senators", PHA: "Philadelphia Athletics", KCA: "Kansas City Athletics", NYG: "New York Giants"},
    nba: { "L.A. LAKERS": "Los Angeles Lakers", "L.A. CLIPPERS": "Los Angeles Clippers", DEN: "Denver Nuggets", SEA: "Seattle SuperSonics" },
  nhl: { CBJ: "Columbus Blue Jackets", NJ: "New Jersey Devils", NJD: "New Jersey Devils", NYR: "New York Rangers", NYI: "New York Islanders", PIT: "Pittsburgh Penguins", MIN: "Minnesota North Stars", EDM: "Edmonton Oilers", SJS: "San Jose Sharks", PHI: "Philadelphia Flyers", HAR: "Hartford Whalers", HFD: "Hartford Whalers", TOR: "Toronto Maple Leafs", MTL: "Montreal Canadiens", BOS: "Boston Bruins", CHI: "Chicago Blackhawks", DET: "Detroit Red Wings", LAK: "Los Angeles Kings", STL: "St. Louis Blues", VAN: "Vancouver Canucks", CGY: "Calgary Flames", WSH: "Washington Capitals", BUF: "Buffalo Sabres", COL: "Colorado Avalanche", DAL: "Dallas Stars", FLA: "Florida Panthers", TBL: "Tampa Bay Lightning", NSH: "Nashville Predators", CAR: "Carolina Hurricanes", ANA: "Anaheim Ducks", OTT: "Ottawa Senators", WPG: "Winnipeg Jets", ARI: "Arizona Coyotes", PHX: "Phoenix Coyotes", VGK: "Vegas Golden Knights", SEA: "Seattle Kraken", OAK: "Oakland Seals", CAL: "California Golden Seals", ATL: "Atlanta Flames", QUE: "Quebec Nordiques", WIN: "Winnipeg Jets" },
};
const resolve = (lg, raw, season) => {
  const list = namesByLg[lg];
  const ab = ABBR[lg]?.[raw.trim().toUpperCase()];
  if (ab) { const hit = list.find((t) => norm(t) === norm(ab)); if (hit) return hit; }
  const n = norm(raw);
  const exact = list.find((t) => norm(t) === n); if (exact) return exact;
  let cands = list.filter((t) => norm(t).startsWith(n + " ") || norm(t).endsWith(" " + n));
  if (cands.length > 1 && season) {
    const inSeason = teamsBySeason[lg]?.[season];
    if (inSeason) { const era = cands.filter((t) => inSeason.has(t)); if (era.length) cands = era; }
  }
  return cands.length === 1 ? cands[0] : null;
};
const recs = JSON.parse(readFileSync("src/lib/coach-records.json", "utf8"));
const index = {}, unmatched = {};
let total = 0;
for (const [slug, c] of Object.entries(recs)) {
  for (const r of c.rows) {
    for (const league of c.leagues) {
      const lg = LG[league]; if (!lg) continue;
    const season = r.season.replace(/[^\d-]/g, "").trim();
      const team = resolve(lg, r.team, season);
      if (!team) { unmatched[`${lg}|${r.team}`] = (unmatched[`${lg}|${r.team}`] ?? 0) + 1; continue; }
      const key = `${lg}|${team}|${season}`;
      index[key] ??= [];
      if (!index[key].some((x) => x.slug === slug)) { index[key].push({ slug, name: c.name }); total++; }
    }
  }
}
writeFileSync("src/lib/team-season-coaches.json", JSON.stringify(index));
console.log(`Indexed ${Object.keys(index).length} team-seasons (${total} coach assignments).`);
const un = Object.entries(unmatched).sort((a, b) => b[1] - a[1]).slice(0, 30);
if (un.length) { console.log("Top unmatched:"); for (const [k, n] of un) console.log(`  ${k} ×${n}`); }