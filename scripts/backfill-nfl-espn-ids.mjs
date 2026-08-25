import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const nflPlayers = players.filter((p) => (p.strSport ?? "") === "American Football");
console.log(`${nflPlayers.length} NFL players in index.`);

let map = {};
try { map = JSON.parse(readFileSync("src/lib/nfl-espn-ids.json", "utf8")); } catch {}
console.log(`Resuming with ${Object.keys(map).length} already attempted.`);

let found = 0, i = 0;
for (const p of nflPlayers) {
  i++;
  if (map[p.idPlayer] !== undefined) continue;
  let numericId = null;
  try {
    const url = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(p.strPlayer)}&limit=10&type=player`;
    const j = await fetch(url).then((r) => r.json());
    const items = (j?.results ?? []).flatMap((r) => r?.contents ?? []);
    for (const it of items) {
      if ((it?.sport ?? "").toLowerCase() !== "football") continue;
      const dn = it?.displayName ?? "";
      if (norm(dn) !== norm(p.strPlayer) && bare(dn) !== bare(p.strPlayer)) continue;
      // the numeric athlete id lives in the profile link, e.g. .../player/_/id/3139477/...
      const link = it?.link?.web ?? it?.link?.href ?? "";
      const m = String(link).match(/\/id\/(\d+)/);
      if (m) { numericId = m[1]; break; }
      // fallback: some payloads carry a numeric uid segment like "s:20~l:28~a:3139477"
      const uidM = String(it?.uid ?? "").match(/~a:(\d+)/);
      if (uidM) { numericId = uidM[1]; break; }
    }
  } catch { /* network — rerun resumes */ }
  if (numericId) {
    map[p.idPlayer] = numericId;
    found++;
    console.log(`${i}/${nflPlayers.length} ✓ ${p.strPlayer} → ${numericId}`);
  } else {
    map[p.idPlayer] = null;
  }
  if (i % 50 === 0) {
    writeFileSync("src/lib/nfl-espn-ids.json", JSON.stringify(map));
    if (i % 500 === 0) console.log(`  …${i}/${nflPlayers.length} scanned, ${found} mapped`);
  }
  await sleep(400);
}
writeFileSync("src/lib/nfl-espn-ids.json", JSON.stringify(map));
console.log(`\nDone. ${found} numeric ESPN IDs mapped.`);