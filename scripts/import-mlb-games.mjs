import { writeFileSync, mkdirSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync("src/lib/seasons/mlb", { recursive: true });
let index = [];
try { index = JSON.parse(readFileSync("src/lib/seasons/mlb/index.json", "utf8")); } catch {}
const done = new Set(index);
const KEEP = new Set(["R", "F", "D", "L", "W"]); // regular, WC, LDS, LCS, World Series

for (let y = new Date().getFullYear(); y >= 1901; y--) {
  const season = String(y);
  if (done.has(season)) continue;
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=${y}`);
    if (!res.ok) { console.log(`${y}: HTTP ${res.status} — stopping; paste this`); break; }
    const j = await res.json();
    const games = {};
    let n = 0;
    for (const d of j?.dates ?? []) {
      for (const g of d?.games ?? []) {
        if (!KEEP.has(g.gameType)) continue;
        n++;
        const entry = {
          id: `mlb-${y}-${g.gamePk}`,
          date: (g.gameDate ?? d.date ?? "").slice(0, 10),
          type: g.gameType === "R" ? "REG" : g.gameType === "W" ? "WS" : "PO",
          away: g.teams?.away?.team?.name ?? "Away",
          home: g.teams?.home?.team?.name ?? "Home",
          as: g.teams?.away?.score ?? null,
          hs: g.teams?.home?.score ?? null,
        };
        const prev = games[entry.id];
        // duplicate listings = postponements; keep the one that actually has a final score
        if (!prev || (prev.as == null && entry.as != null)) games[entry.id] = entry;
      }
    }
    writeFileSync(`src/lib/seasons/mlb/${season}.json`, JSON.stringify(Object.values(games)));
    index = [...new Set([...index, season])].sort();
    writeFileSync("src/lib/seasons/mlb/index.json", JSON.stringify(index));
    console.log(`${season}: ${n} games ✓`);
    await sleep(400);
  } catch { console.log(`${y}: network fail — rerun to resume`); break; }
}
console.log("MLB done.");