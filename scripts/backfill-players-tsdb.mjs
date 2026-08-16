import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

const missing = JSON.parse(readFileSync("src/lib/nba-missing-players.json", "utf8"));
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.map((p) => norm(p.strPlayer)));

let added = 0, i = 0;
for (const m of missing) {
  i++;
  if (have.has(norm(m.name))) continue;
  let list = null;
  for (let a = 1; a <= 2 && list === null; a++) {
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(m.name)}`);
      const j = await res.json();
      list = j?.player ?? [];
    } catch { if (a < 2) await sleep(3000); }
  }
  const hit = (list ?? []).find((p) => (p.strSport ?? "") === "Basketball" && norm(p.strPlayer) === norm(m.name));
  if (hit) {
    players.push({
      idPlayer: hit.idPlayer, strPlayer: hit.strPlayer, idTeam: hit.idTeam ?? "",
      strTeam: hit.strTeam ?? "_Retired", strLeague: "NBA", strSport: "Basketball",
      strPosition: hit.strPosition ?? null, strThumb: hit.strThumb ?? hit.strCutout ?? null,
    });
    have.add(norm(m.name));
    added++;
    console.log(`${i}/${missing.length} ✓ ${hit.strPlayer}`);
  }
  if (i % 25 === 0) writeFileSync("src/lib/players.json", JSON.stringify(players));
  await sleep(600);
}
writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nAdded ${added} players from TSDB.`);