import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
const missing = JSON.parse(readFileSync("src/lib/nhl-missing-players.json", "utf8"));
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.filter((p) => (p.strSport ?? "") === "Ice Hockey").flatMap((p) => [norm(p.strPlayer), bare(p.strPlayer)]));
let added = 0, i = 0;
for (const m of missing) {
  i++;
  if (have.has(norm(m.name)) || have.has(bare(m.name))) continue;
  let list = null;
  for (let a = 1; a <= 2 && list === null; a++) {
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(m.name)}`);
      const j = await res.json();
      list = j?.player ?? [];
    } catch { if (a < 2) await sleep(3000); }
  }
  const hit = (list ?? []).find((p) => (p.strSport ?? "") === "Ice Hockey" &&
    (norm(p.strPlayer) === norm(m.name) || bare(p.strPlayer) === bare(m.name)));
  if (hit) {
    players.push({
      idPlayer: hit.idPlayer, strPlayer: m.name, idTeam: hit.idTeam ?? "",
      strTeam: hit.strTeam ?? "_Retired", strLeague: "NHL", strSport: "Ice Hockey",
      strPosition: hit.strPosition ?? null, strThumb: hit.strThumb ?? hit.strCutout ?? null,
    });
    have.add(norm(m.name));
    added++;
    console.log(`${i}/${missing.length} ✓ ${m.name}`);
  }
  if (i % 50 === 0) {
    writeFileSync("src/lib/players.json", JSON.stringify(players));
    if (i % 500 === 0) console.log(`  …${i}/${missing.length} scanned, ${added} rescued so far`);
  }
  await sleep(500);
}
writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nNHL rescue done: added ${added} of ${missing.length}.`);
const { execSync } = await import("child_process");
execSync("node scripts/audit-nhl-players.mjs", { stdio: "inherit" });