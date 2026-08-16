import { readFileSync, readdirSync, writeFileSync } from "fs";

const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const have = new Set(players.map((p) => norm(p.strPlayer)));
let PID = { map: {}, names: {} };
try { PID = JSON.parse(readFileSync("src/lib/nba-player-ids.json", "utf8")); } catch {}

const seen = new Map(); // norm -> { name, first, last, games, teams:Set }
const dir = "src/lib/boxscores/nba";
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const season = f.replace(".json", "");
  const store = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const gameIdRaw = (k) => k.split("-").slice(2).join("-");
  for (const [gameKey, box] of Object.entries(store)) {
    if (box.unavailable) continue;
    for (const grp of box.groups ?? []) {
      for (const row of grp.rows ?? []) {
        const rawGid = gameIdRaw(gameKey);
        const key = PID.map[`${rawGid}|${norm(row.name)}`] ?? norm(row.name);
        if (!key) continue;
        const e = seen.get(key) ?? { name: row.name, first: season, last: season, games: 0, teams: new Set() };
        e.games++;
        if (season < e.first) e.first = season;
        if (season > e.last) e.last = season;
        e.teams.add(grp.title);
        seen.set(key, e);
      }
    }
  }
}

const missing = [...seen.entries()]
  .filter(([key, e]) => !have.has(norm(PID.names[key] ?? e.name)))
  .map(([key, e]) => ({ nbaId: PID.names[key] ? key : null, ...e, teams: [...e.teams] }))
  .sort((a, b) => b.games - a.games);

writeFileSync("src/lib/nba-missing-players.json", JSON.stringify(missing, null, 2));
console.log(`Box scores contain ${seen.size} distinct players; ${missing.length} have no player page.`);
console.log("Top 20 by games played:");
for (const m of missing.slice(0, 20)) console.log(`  ${m.name} — ${m.games} games, ${m.first}→${m.last}`);