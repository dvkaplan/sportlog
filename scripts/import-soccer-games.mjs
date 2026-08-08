import { writeFileSync, mkdirSync, readFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEAGUES = { epl: "E0", laliga: "SP1", seriea: "I1", bundesliga: "D1", ligue1: "F1" };

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const isoDate = (d) => {
  const m = (d ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return d ?? "";
  const yy = m[3].length === 2 ? (Number(m[3]) > 70 ? `19${m[3]}` : `20${m[3]}`) : m[3];
  return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

for (const [lg, code] of Object.entries(LEAGUES)) {
  mkdirSync(`src/lib/seasons/${lg}`, { recursive: true });
  let index = [];
  try { index = JSON.parse(readFileSync(`src/lib/seasons/${lg}/index.json`, "utf8")); } catch {}
  const done = new Set(index);
  for (let y = new Date().getFullYear(); y >= 1993; y--) {
    const season = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
    if (done.has(season) && y !== new Date().getFullYear()) continue; // always refresh current season
    const yy = String(y % 100).padStart(2, "0") + String((y + 1) % 100).padStart(2, "0");
    try {
      const res = await fetch(`https://www.football-data.co.uk/mmz4281/${yy}/${code}.csv`);
      if (!res.ok) { console.log(`${lg} ${season}: HTTP ${res.status} (probably predates this league's file) — skipping`); continue; }
      const rows = parseCSV(await res.text());
      const head = rows[0].map((h) => h.trim());
      const c = (n) => head.indexOf(n);
      const iDate = c("Date"), iH = c("HomeTeam"), iA = c("AwayTeam"), iHG = c("FTHG"), iAG = c("FTAG");
      const games = [];
      rows.slice(1).forEach((r, n) => {
        if (!r[iH] || !r[iA]) return;
        games.push({
          id: `${lg}-${y}-${n}`,
          date: isoDate(r[iDate]),
          type: "REG",
          home: r[iH], away: r[iA],
          hs: r[iHG] === "" ? null : Number(r[iHG]),
          as: r[iAG] === "" ? null : Number(r[iAG]),
        });
      });
      writeFileSync(`src/lib/seasons/${lg}/${season}.json`, JSON.stringify(games));
      index = [...new Set([...index, season])].sort();
      writeFileSync(`src/lib/seasons/${lg}/index.json`, JSON.stringify(index));
      console.log(`${lg} ${season}: ${games.length} games ✓`);
      await sleep(300);
    } catch { console.log(`${lg} ${season}: network fail — rerun to resume`); }
  }
}
console.log("Soccer done.");