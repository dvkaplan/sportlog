import { writeFileSync, mkdirSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync("src/lib/seasons/nhl", { recursive: true });
let index = [];
try { index = JSON.parse(readFileSync("src/lib/seasons/nhl/index.json", "utf8")); } catch {}
const done = new Set(index);
const label = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
let logged = false;
const teamName = (t) => {
  const place = t?.placeName?.default ?? "";
  const nick = t?.commonName?.default ?? t?.name?.default ?? "";
  const full = `${place} ${nick}`.trim();
  return full || t?.abbrev || "Team";
};

for (let y = new Date().getFullYear(); y >= 1917; y--) {
  const season = label(y);
  if (done.has(season)) continue;
  const games = {};
  let date = `${y}-09-01`;
  let ok = true;
  while (date && date < `${y + 1}-08-01`) {
    try {
      const res = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`);
      if (!res.ok) { console.log(`${season} @${date}: HTTP ${res.status}`); ok = false; break; }
      const j = await res.json();
      for (const day of j?.gameWeek ?? []) {
        for (const g of day?.games ?? []) {
          if (g.gameType !== 2 && g.gameType !== 3) continue; // regular + playoffs only
          if (!logged) { console.log("SAMPLE TEAM OBJECT:", JSON.stringify(g.awayTeam).slice(0, 300)); logged = true; }
          games[g.id] = {
            id: `nhl-${y}-${g.id}`,
            date: day.date,
            type: g.gameType === 3 ? "PO" : "REG",
            away: teamName(g.awayTeam),
            home: teamName(g.homeTeam),
            as: g.awayTeam?.score ?? null,
            hs: g.homeTeam?.score ?? null,
            ot: /OT|SO/.test(g.gameOutcome?.lastPeriodType ?? ""),
          };
        }
      }
      const next = j?.nextStartDate ?? null;
      if (!next || next <= date) break;
      date = next;
      await sleep(350);
    } catch { console.log(`${season} @${date}: network fail`); ok = false; break; }
  }
  if (!ok) { console.log(`Stopping at ${season} — rerun to resume.`); break; }
  const arr = Object.values(games);
  if (arr.length > 0) {
    writeFileSync(`src/lib/seasons/nhl/${season}.json`, JSON.stringify(arr));
    index = [...new Set([...index, season])].sort();
    writeFileSync("src/lib/seasons/nhl/index.json", JSON.stringify(index));
  }
  console.log(`${season}: ${arr.length} games ✓`);
}
console.log("NHL done (or stopped).");