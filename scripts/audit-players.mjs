import { readFileSync, readdirSync, writeFileSync } from "fs";

const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.map((p) => norm(p.strPlayer)));
const PID = JSON.parse(readFileSync("src/lib/nba-player-ids.json", "utf8"));

// teams per player, from whatever box scores we've harvested (enriches generated pages)
const teamsById = {};
const dir = "src/lib/boxscores/nba";
try {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const store = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
    for (const [gameKey, box] of Object.entries(store)) {
      if (box.unavailable) continue;
      const rawGid = gameKey.split("-").slice(2).join("-");
      for (const grp of box.groups ?? []) {
        for (const row of grp.rows ?? []) {
          const id = PID.map[`${rawGid}|${norm(row.name)}`];
          if (!id) continue;
          (teamsById[id] ??= new Set()).add(grp.title);
        }
      }
    }
  }
} catch {}

const universe = Object.entries(PID.names); // every NBA player ever, 1946 → today
const missing = universe
.filter(([, name]) => !have.has(norm(name)) && !have.has(norm(name).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "")))
  .map(([id, name]) => ({
    nbaId: id,
    name,
    first: PID.meta?.[id]?.first ?? "",
    last: PID.meta?.[id]?.last ?? "",
    games: PID.meta?.[id]?.games ?? 0,
    teams: [...(teamsById[id] ?? [])],
  }))
  .sort((a, b) => b.games - a.games);

writeFileSync("src/lib/nba-missing-players.json", JSON.stringify(missing, null, 2));
console.log(`All-time NBA universe: ${universe.length} players.`);
console.log(`${universe.length - missing.length} have curated/TSDB pages · ${missing.length} will be served by generated pages.`);
console.log("Top 20 generated-tier players by games:");
for (const m of missing.slice(0, 20)) console.log(`  ${m.name} — ${m.games} games, ${m.first}→${m.last}`);