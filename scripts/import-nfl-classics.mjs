import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\[[^\]]{0,15}\]/g, "").replace(/\s+/g, " ").trim();
const nick = (n) => (n ?? "").trim().split(/\s+/).pop().toLowerCase();
const stripFoot = (s) => s.replace(/\s*[\d†‡*]+$/g, "").trim();

let store = {};
try { store = JSON.parse(readFileSync("src/lib/boxscores/nfl-legacy.json", "utf8")); } catch {}

async function fetchHtml(title) {
  for (let a = 1; a <= 4; a++) {
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*&redirects=1`,
        { headers: { "User-Agent": "SPORTLOG/1.0 (student project)" } });
      const raw = await res.text();
      if (raw.startsWith("You are") || res.status === 429) { console.log(`  (rate-limited, ${30 * a}s…)`); await sleep(30000 * a); continue; }
      return JSON.parse(raw)?.parse?.text?.["*"] ?? "";
    } catch { await sleep(20000 * a); }
  }
  return "";
}

function parseTables(html) {
  const tables = [...html.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const rowsOf = (t) => [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => clean(c[1])));
  let teamStats = [], header = null;
  for (const t of tables) {
    const rows = rowsOf(t);
    if (!rows.some((r) => /^first downs$/i.test(r[0] ?? ""))) continue;
    header = rows.find((r) => r.length === 3 && (!r[0] || /^statistics?$/i.test(r[0]))) ?? null;
    for (const r of rows) {
      if (r.length !== 3 || !r[0] || !r[1]) continue;
      teamStats.push({ label: r[0], a: r[1], b: r[2] });
    }
    break;
  }
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
  return { teamStats, header, groups };
}

// Standalone famous-game articles → their season (game found by matching teams)
const CLASSICS = {
  "The Epic in Miami": 1981, "The Catch (American football)": 1981, "The Drive": 1986,
  "The Fumble (American football)": 1987, "Fog Bowl": 1988, "Ghost to the Post": 1977,
  "Sea of Hands": 1974, "Red Right 88": 1980, "The Comeback (American football)": 1992,
  "Freezer Bowl": 1981, "Ice Bowl": 1967,
};

const targets = [];
for (let y = 1966; y <= 1969; y++) targets.push({ title: `${y} NFL Championship Game`, season: y }, { title: `${y} AFL Championship Game`, season: y });
for (let y = 1970; y <= 1998; y++) targets.push({ title: `${y} AFC Championship Game`, season: y }, { title: `${y} NFC Championship Game`, season: y });
for (const [title, season] of Object.entries(CLASSICS)) targets.push({ title, season });

for (const { title, season } of targets) {
  const games = JSON.parse(readFileSync(`src/lib/seasons/nfl/${season}.json`, "utf8"));
  const playoffPool = games.filter((g) => g.type !== "REG");
  if (playoffPool.every((g) => store[g.id])) continue; // season's playoff sheet already full
  const html = await fetchHtml(title);
  if (!html || html.length < 20000) { console.log(`✗ ${title}: no article`); await sleep(4000); continue; }
  const { teamStats, header, groups } = parseTables(html);
  if (teamStats.length === 0 && groups.length === 0) { console.log(`⚠ ${title}: parsed nothing`); await sleep(4000); continue; }
  // find the game by the two team names in the stats-table header
  const [nA, nB] = header ? [nick(header[1]), nick(header[2])] : [null, null];
  const game = playoffPool.find((g) => {
    const pair = new Set([nick(g.away), nick(g.home)]);
    return nA && nB && pair.has(nA) && pair.has(nB);
  });
  if (!game) { console.log(`⚠ ${title}: parsed but couldn't match a playoff game (${header?.[1]} vs ${header?.[2]})`); await sleep(4000); continue; }
  if (store[game.id]) { console.log(`· ${title}: already have ${game.id}`); await sleep(4000); continue; }
  const col1IsAway = nA === nick(game.away);
  store[game.id] = {
    teamStats: teamStats.map((r) => ({ label: r.label, away: col1IsAway ? r.a : r.b, home: col1IsAway ? r.b : r.a })),
    groups, source: "wikipedia",
  };
  writeFileSync("src/lib/boxscores/nfl-legacy.json", JSON.stringify(store));
  console.log(`✓ ${title} → ${game.id} (teamStats=${teamStats.length} groups=${groups.length})`);
  await sleep(4000);
}
console.log("\nClassics import done.");