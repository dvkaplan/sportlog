import { readFileSync, writeFileSync } from "fs";
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.flatMap((p) => [norm(p.strPlayer), bare(p.strPlayer)]));
const PID = JSON.parse(readFileSync("src/lib/mlb-player-ids.json", "utf8"));
const universe = Object.entries(PID.names);
const missing = universe
  .filter(([, name]) => !have.has(norm(name)) && !have.has(bare(name)))
  .map(([id, name]) => ({
    mlbId: id, name,
    first: String(PID.meta?.[id]?.first ?? ""), last: String(PID.meta?.[id]?.last ?? ""),
    games: 0, teams: [],
  }))
  .sort((a, b) => (b.last || "0").localeCompare(a.last || "0"));
writeFileSync("src/lib/mlb-missing-players.json", JSON.stringify(missing, null, 2));
console.log(`MLB universe: ${universe.length}. ${universe.length - missing.length} have pages · ${missing.length} missing.`);