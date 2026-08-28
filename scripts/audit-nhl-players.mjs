import { readFileSync, writeFileSync } from "fs";
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.filter((p) => (p.strSport ?? "") === "Ice Hockey").flatMap((p) => [norm(p.strPlayer), bare(p.strPlayer)]));
const PID = JSON.parse(readFileSync("src/lib/nhl-player-ids.json", "utf8"));
const fmtS = (s) => s ? `${String(s).slice(0, 4)}-${String(s).slice(6)}` : "";
const universe = Object.entries(PID.names);
const missing = universe
  .filter(([, name]) => !have.has(norm(name)) && !have.has(bare(name)))
  .map(([id, name]) => ({
    nhlId: id, name,
    first: fmtS(PID.meta?.[id]?.first), last: fmtS(PID.meta?.[id]?.last),
    games: 0, teams: [],
  }))
  .sort((a, b) => (b.last || "0").localeCompare(a.last || "0"));
writeFileSync("src/lib/nhl-missing-players.json", JSON.stringify(missing, null, 2));
console.log(`NHL universe: ${universe.length}. ${universe.length - missing.length} have pages · ${missing.length} missing.`);