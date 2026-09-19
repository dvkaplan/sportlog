import { readFileSync } from "fs";
const univ = JSON.parse(readFileSync("src/lib/nba-player-ids.json", "utf8"));
const id = Object.entries(univ.names).find(([, n]) => n === (process.argv[2] ?? "Bobby Watson"))?.[0];
console.log("id:", id, "| meta:", JSON.stringify(univ.meta?.[id]));
const res = await fetch(`https://stats.nba.com/stats/playercareerstats?PlayerID=${id}&PerMode=PerGame&LeagueID=00`, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", Referer: "https://www.nba.com/", "x-nba-stats-origin": "stats", "x-nba-stats-token": "true", Accept: "application/json" } });
console.log("status:", res.status);
console.log((await res.text()).slice(0, 300));