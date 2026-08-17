import { readFileSync, writeFileSync, mkdirSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const roman = (n) => { const R = [[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]]; let s = ""; for (const [v, sym] of R) while (n >= v) { s += sym; n -= v; } return s; };
const clean = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\[[^\]]{0,15}\]/g, "").replace(/\s+/g, " ").trim();
const nick = (n) => (n ?? "").trim().split(/\s+/).pop().toLowerCase();
const stripFoot = (s) => s.replace(/\s*[\d†‡*]+$/g, "").trim();

mkdirSync("src/lib/boxscores", { recursive: true });
let store = {};
try { store = JSON.parse(readFileSync("src/lib/boxscores/nfl-legacy.json", "utf8")); } catch {}

for (let season = 1966; season <= 1998; season++) {
  const games = JSON.parse(readFileSync(`src/lib/seasons/nfl/${season}.json`, "utf8"));
  const sb = games.find((g) => g.type === "SB");
  if (!sb) { console.log(`${season}: no SB row in season file`); continue; }
  if (store[sb.id]) { console.log(`${season}: already imported`); continue; }
  const title = `Super Bowl ${roman(season - 1965)}`;
  let html = "";
  for (let a = 1; a <= 4 && !html; a++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } });
      const raw = await res.text();
      if (raw.startsWith("You are") || res.status === 429) { console.log(`  (rate-limited, waiting ${30 * a}s…)`); await sleep(30000 * a); continue; }
      html = JSON.parse(raw)?.parse?.text?.["*"] ?? "";
    } catch { await sleep(20000 * a); }
  }
  if (!html) { console.log(`${season}: ${title} — no page`); await sleep(1000); continue; }
  const tables = [...html.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const rowsOf = (t) => [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => clean(c[1])));

  // Team stats table: first table containing a row starting "First downs"
  let teamStats = [];
  for (const t of tables) {
    const rows = rowsOf(t);
    if (!rows.some((r) => /^first downs$/i.test(r[0] ?? ""))) continue;
    const header = rows.find((r) => r.length === 3 && !r[0]);
    const col1IsAway = header ? nick(header[1]) === nick(sb.away) : true;
    for (const r of rows) {
      if (r.length !== 3 || !r[0] || !r[1]) continue;
      teamStats.push({ label: r[0], away: col1IsAway ? r[1] : r[2], home: col1IsAway ? r[2] : r[1] });
    }
    break;
  }

  // Player tables: any table containing a single-cell " passing" section row
  const groups = [];
  for (const t of tables) {
    const rows = rowsOf(t);
    if (!rows.some((r) => r.length === 1 && / (passing|rushing|receiving)$/i.test(r[0]))) continue;
    let section = null, columns = [];
    for (const r of rows) {
      if (r.length === 1 && r[0]) { section = r[0]; columns = []; continue; }
      if (!section) continue;
      if (!r[0] && r.length > 2) { columns = r.slice(1).map(stripFoot); continue; }
      if (r[0] && r.length > 2 && columns.length) {
        let grp = groups.find((g) => g.title === section);
        if (!grp) { grp = { title: section, columns, rows: [] }; groups.push(grp); }
        grp.rows.push({ name: r[0], cells: r.slice(1, columns.length + 1) });
      }
    }
  }

  if (teamStats.length === 0 && groups.length === 0) {
    console.log(`${season}: ${title} — parsed nothing ⚠ (structure drift; tell Claude)`);
  } else {
    store[sb.id] = { teamStats, groups, source: "wikipedia" };
    writeFileSync("src/lib/boxscores/nfl-legacy.json", JSON.stringify(store));
    console.log(`${season}: ${title} ✓ teamStats=${teamStats.length} groups=${groups.length}`);
  }
  await sleep(4000);
}
console.log("\nSuper Bowl import done.");