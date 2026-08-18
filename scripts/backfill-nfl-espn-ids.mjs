import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const nflPlayers = players.filter((p) => (p.strSport ?? "") === "American Football");
console.log(`${nflPlayers.length} NFL players in index.`);

let map = {};
try { map = JSON.parse(readFileSync("src/lib/nfl-espn-ids.json", "utf8")); } catch {}
const doneCount = Object.keys(map).length;
console.log(`Resuming with ${doneCount} already mapped.`);

let found = 0, i = 0;
for (const p of nflPlayers) {
  i++;
  if (map[p.idPlayer] !== undefined) continue; // already tried (null = tried, not found)
  let hit = null;
  try {
    const url = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(p.strPlayer)}&limit=10&type=player`;
    const j = await fetch(url).then((r) => r.json());
    const items = (j?.results ?? []).flatMap((r) => r?.contents ?? []);
    hit = items.find((it) =>
      (it?.sport ?? "").toLowerCase() === "football" &&
      (norm(it?.displayName ?? "") === norm(p.strPlayer) || bare(it?.displayName ?? "") === bare(p.strPlayer))
    ) ?? null;
  } catch { /* network — leave for rerun */ }
  if (hit?.id) {
    map[p.idPlayer] = String(hit.id);
    found++;
    console.log(`${i}/${nflPlayers.length} ✓ ${p.strPlayer} → ${hit.id}`);
  } else {
    map[p.idPlayer] = null; // mark as tried so reruns skip it
  }
  if (i % 50 === 0) {
    writeFileSync("src/lib/nfl-espn-ids.json", JSON.stringify(map));
    if (i % 500 === 0) console.log(`  …${i}/${nflPlayers.length} scanned, ${found} new mappings`);
  }
  await sleep(400);
}
writeFileSync("src/lib/nfl-espn-ids.json", JSON.stringify(map));
console.log(`\nDone. ${found} new ESPN IDs mapped (${Object.keys(map).length} total attempted).`);