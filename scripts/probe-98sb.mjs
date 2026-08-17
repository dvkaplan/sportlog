import { readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const map = JSON.parse(readFileSync("src/lib/nfl-espn-map.json", "utf8")).map;
const targets = Object.keys(map).filter((k) => /^nfl-199[3-8]-/.test(k));
console.log("First 15 mapped 93–98 ids:");
targets.slice(0, 15).forEach((k) => console.log(` ${k} → ${map[k]}`));
console.log("\nProbing first 6 for data:");
for (const gid of targets.slice(0, 6)) {
  try {
    const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${map[gid]}`).then((r) => r.json());
    const avail = j?.header?.competitions?.[0]?.boxscoreAvailable ?? false;
    const ts = j?.boxscore?.teams?.[0]?.statistics?.length ?? 0;
    const ath = (j?.boxscore?.players ?? []).reduce((n, t) => n + (t.statistics ?? []).reduce((m, c) => m + (c.athletes?.length ?? 0), 0), 0);
    console.log(`${gid}: avail=${avail} teamStats=${ts} athletes=${ath}`);
  } catch { console.log(`${gid}: fetch failed`); }
  await sleep(400);
}