import { readFileSync, writeFileSync } from "fs";
const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const IDS = process.argv.slice(2);
if (!IDS.length) { console.log("usage: node scripts/add-player-by-tsdb-id.mjs <idPlayer> [<idPlayer> ...]"); process.exit(1); }
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const seen = new Set(players.map((p) => p.idPlayer));
for (const id of IDS) {
  if (seen.has(id)) { console.log(`${id}: already in index`); continue; }
  const j = await fetch(`${BASE}/lookupplayer.php?id=${id}`).then((r) => r.json());
  const p = j?.players?.[0];
  if (!p) { console.log(`${id}: not found on TSDB`); continue; }
  players.push({
    idPlayer: p.idPlayer, strPlayer: p.strPlayer, idTeam: p.idTeam ?? "",
    strTeam: p.strTeam ?? "_Retired", strLeague: p.strLeague ?? null, strSport: p.strSport ?? null,
    strPosition: p.strPosition ?? null, strThumb: p.strThumb ?? p.strCutout ?? null,
  });
  console.log(`${id}: ✓ added ${p.strPlayer} (${p.strSport}, ${p.strTeam})`);
}
writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`Done. ${players.length} players.`);