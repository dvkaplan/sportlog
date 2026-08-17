import { readFileSync, writeFileSync } from "fs";

const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
const slug = (n) => bare(n).replace(/\s+/g, "-");

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.flatMap((p) => [norm(p.strPlayer), bare(p.strPlayer)]));

const PID = JSON.parse(readFileSync("src/lib/nfl-player-ids.json", "utf8"));

// Tier A: the nflverse universe
const missing = Object.entries(PID.names)
  .filter(([, name]) => !have.has(norm(name)) && !have.has(bare(name)))
  .map(([id, name]) => ({
    nflId: id,
    name,
    first: PID.meta?.[id]?.first ?? "",
    last: PID.meta?.[id]?.last ?? "",
    games: 0,
    teams: [PID.meta?.[id]?.pos, PID.meta?.[id]?.team].filter(Boolean),
  }));

// Tier B: pre-1999 legacy box score names not covered by A or players.json
let legacyCount = 0;
try {
  const store = JSON.parse(readFileSync("src/lib/boxscores/nfl-legacy.json", "utf8"));
  const universeNorms = new Set(Object.values(PID.names).map(bare));
  const seen = new Map();
  for (const box of Object.values(store)) {
    for (const grp of box.groups ?? []) {
      for (const row of grp.rows ?? []) {
        const b = bare(row.name);
        if (!b || have.has(b) || universeNorms.has(b) || seen.has(b)) continue;
        seen.set(b, row.name);
      }
    }
  }
  for (const [b, name] of seen) {
    missing.push({ nflId: `legacy-${slug(name)}`, name, first: "", last: "", games: 0, teams: ["Pre-1999"] });
    legacyCount++;
  }
} catch {}

missing.sort((a, b) => (b.last || "0").localeCompare(a.last || "0"));
writeFileSync("src/lib/nfl-missing-players.json", JSON.stringify(missing, null, 2));
console.log(`NFL universe: ${Object.keys(PID.names).length} (nflverse) + ${legacyCount} legacy-only names.`);
console.log(`${Object.keys(PID.names).length + legacyCount - missing.length} already have pages · ${missing.length} missing.`);
console.log("Sample of 20 missing (most recent first):");
for (const m of missing.slice(0, 20)) console.log(`  ${m.name} — ${m.teams.join(", ")} ${m.first && m.last ? `(${m.first}→${m.last})` : ""}`);