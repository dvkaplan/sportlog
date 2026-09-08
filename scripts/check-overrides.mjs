import { readFileSync } from "fs";
const o = JSON.parse(readFileSync("src/lib/link-overrides.json", "utf8"));
const nfl = JSON.parse(readFileSync("src/lib/nfl-missing-players.json", "utf8")).map((x) => `nfl-${x.nflId}`);
const nba = JSON.parse(readFileSync("src/lib/nba-missing-players.json", "utf8")).map((x) => `nba-${x.nbaId}`);
const live = new Set([...nfl, ...nba]);
let stale = 0;
for (const [k, v] of Object.entries(o)) {
  if (/^(nfl|nba)-/.test(v) && !live.has(v)) { console.log(`STALE: ${k} → ${v}`); stale++; }
}
console.log(stale ? `${stale} stale override(s) — swap each to the player's real TSDB id.` : "check done — all overrides healthy.");