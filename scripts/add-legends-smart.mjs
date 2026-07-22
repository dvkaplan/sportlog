import { writeFileSync, readFileSync } from "fs";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;

// name + the sport we mean, so collisions resolve correctly
const WANTED = [
  ["Michael Jordan", "Basketball"],
  ["Ronaldo", "Soccer"],
  // add any other misses from the last run here as [name, sport] pairs
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const seenIds = new Set(players.map((p) => p.idPlayer));
console.log(`Starting from ${players.length} players`);

for (const [name, sport] of WANTED) {
  let list = null;
  for (let attempt = 1; attempt <= 2 && list === null; attempt++) {
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(name)}`);
      const json = await res.json();
      list = json?.player ?? null;
      if (list === null && attempt < 2) await sleep(4000);
    } catch { if (attempt < 2) await sleep(4000); }
  }
  const candidates = (list ?? []).filter(
    (p) => p.strPlayer?.toLowerCase() === name.toLowerCase() && (p.strSport ?? "").toLowerCase() === sport.toLowerCase()
  );
  // prefer the placeholder-team version (retired/deceased/free agent) if multiple
  const match =
    candidates.find((p) => (p.strTeam ?? "").startsWith("_")) ?? candidates[0] ?? null;
  if (!match) {
    console.log(`✗ ${name} (${sport}): not found`);
  } else if (seenIds.has(match.idPlayer)) {
    console.log(`= ${name} (${sport}): already indexed`);
  } else {
    seenIds.add(match.idPlayer);
    players.push({
      idPlayer: match.idPlayer,
      strPlayer: match.strPlayer,
      idTeam: match.idTeam ?? null,
      strTeam: match.strTeam ?? null,
      strLeague: match.strLeague ?? null,
      strSport: match.strSport ?? null,
      strPosition: match.strPosition ?? null,
      strThumb: match.strCutout ?? match.strThumb ?? null,
    });
    console.log(`✓ ${name} (${sport}): added — filed under "${match.strTeam ?? "no team"}"`);
  }
  await sleep(700);
}

writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nDone. ${players.length} players total.`);