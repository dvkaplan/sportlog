import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// name-variant generators: initials with/without dots handled by norm; here we add human variants
const VARIANTS = (name) => {
  const v = new Set([name]);
  v.add(name.replace(/\./g, "")); // T.R. Dunn -> TR Dunn
  v.add(name.replace(/\bClar\.\s/i, "Clarence "));
  v.add(name.replace(/\bJojo\b/i, "Jo Jo"));
  v.add(name.replace(/\bWorld\b/i, "World B."));
  v.add(name.replace(/\bHot Rod\b/i, "John"));
  v.add(name.replace(/\bThomas\b/i, "Satch"));
  v.add(name.replace(/\bLafayette\b/i, "Fat"));
  v.add(name.replace(/\bDan\b/, "Danny"));
  v.add(name.replace(/\bWill\b/, "William"));
  return [...v];
};

const missing = JSON.parse(readFileSync("src/lib/nba-missing-players.json", "utf8"));
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.map((p) => norm(p.strPlayer)));

let added = 0, i = 0;
for (const m of missing) {
  i++;
  if (have.has(norm(m.name))) continue;
  let hit = null;
  for (const variant of VARIANTS(m.name)) {
    let list = null;
    try {
      const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(variant)}`);
      const j = await res.json();
      list = j?.player ?? [];
    } catch { /* skip */ }
    hit = (list ?? []).find((p) => (p.strSport ?? "") === "Basketball" &&
      (norm(p.strPlayer) === norm(variant) || norm(p.strPlayer) === norm(m.name)));
    if (hit) break;
    await sleep(400);
  }
  if (hit) {
    players.push({
      idPlayer: hit.idPlayer, strPlayer: m.name, idTeam: hit.idTeam ?? "",
      strTeam: hit.strTeam ?? "_Retired", strLeague: "NBA", strSport: "Basketball",
      strPosition: hit.strPosition ?? null, strThumb: hit.strThumb ?? hit.strCutout ?? null,
    });
    have.add(norm(m.name));
    added++;
    console.log(`${i}/${missing.length} ✓ ${m.name} (as "${hit.strPlayer}")`);
  }
  if (i % 20 === 0) writeFileSync("src/lib/players.json", JSON.stringify(players));
}
writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nFuzzy pass added ${added}.`);