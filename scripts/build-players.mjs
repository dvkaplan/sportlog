import { writeFileSync, readFileSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;

const teams = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resume support: if players.json exists, skip teams we already indexed
let players = [];
const donePlayerIds = new Set();
const doneTeamIds = new Set();
try {
  players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
  for (const p of players) {
    donePlayerIds.add(p.idPlayer);
    if (p.idTeam) doneTeamIds.add(p.idTeam);
  }
  console.log(`Resuming: ${players.length} players from ${doneTeamIds.size} teams already indexed.`);
} catch { console.log("Starting fresh."); }

let processed = 0;
for (const team of teams) {
  processed++;
  if (doneTeamIds.has(team.idTeam)) {
    console.log(`${processed}/${teams.length} ${team.strTeam}: skipped (done)`);
    continue;
  }
  let list = null;
  for (let attempt = 1; attempt <= 3 && list === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/lookup_all_players.php?id=${team.idTeam}`);
      const json = await res.json();
      list = json?.player ?? null;
      if (list === null && attempt < 3) await sleep(5000);
    } catch { if (attempt < 3) await sleep(5000); }
  }
  let added = 0;
  for (const p of list ?? []) {
    if (donePlayerIds.has(p.idPlayer)) continue;
    donePlayerIds.add(p.idPlayer);
    players.push({
      idPlayer: p.idPlayer,
      strPlayer: p.strPlayer,
      idTeam: team.idTeam,
      strTeam: team.strTeam,
      strLeague: team.strLeague ?? null,
      strSport: p.strSport ?? team.strSport ?? null,
      strPosition: p.strPosition ?? null,
      strThumb: p.strCutout ?? p.strThumb ?? null,
    });
    added++;
  }
  console.log(`${processed}/${teams.length} ${team.strTeam}: +${added}`);
  // Save progress every 25 teams so a crash never loses work
  if (processed % 25 === 0) writeFileSync("src/lib/players.json", JSON.stringify(players));
  await sleep(700);
}

writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nDone. ${players.length} players in src/lib/players.json`);