const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (await import("fs")).readFileSync("src/lib/nfl-espn-map.json", "utf8");
const map = JSON.parse(state).map;
// one game per season, walking back
const bySeason = {};
for (const [gid, espn] of Object.entries(map)) {
  const yr = gid.split("-")[1];
  if (!bySeason[yr]) bySeason[yr] = espn;
}
for (const yr of Object.keys(bySeason).sort().reverse()) {
  try {
    const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${bySeason[yr]}`).then((r) => r.json());
    const avail = j?.header?.competitions?.[0]?.boxscoreAvailable ?? false;
    const athletes = (j?.boxscore?.players ?? []).reduce((n, t) => n + (t.statistics ?? []).reduce((m, c) => m + (c.athletes?.length ?? 0), 0), 0);
    console.log(`${yr}: boxscoreAvailable=${avail} athleteRows=${athletes}`);
  } catch { console.log(`${yr}: fetch failed`); }
  await sleep(400);
}