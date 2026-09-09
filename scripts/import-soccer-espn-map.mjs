import { readFileSync, writeFileSync, existsSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEAGUES = { epl: "eng.1", laliga: "esp.1", seriea: "ita.1", bundesliga: "ger.1", ligue1: "fra.1" };
const ONLY = process.argv[2] ?? null;        // e.g. "epl" — limit to one league
const ONLY_SEASON = process.argv[3] ?? null; // e.g. "2023-24" — limit to one season (smoke test)

const STOP = new Set(["fc","cf","afc","sc","ac","as","us","ss","ssc","club","de","the","cd","ud","rcd","sd","1","fsv","vfl","vfb","tsg","sv","bsc","rb","og","ol","rc","sm","losc","calcio","spa"]);
const norm = (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
const ALIAS = {
  "man united": "manchester united", "man city": "manchester city", "ath madrid": "atletico madrid", "ath bilbao": "athletic club",
  "sociedad": "real sociedad", "betis": "real betis", "espanol": "espanyol", "paris sg": "paris saint germain", "st etienne": "saint etienne",
  "bayern munich": "bayern munich", "ein frankfurt": "eintracht frankfurt", "leverkusen": "bayer leverkusen", "m gladbach": "borussia monchengladbach",
  "wolves": "wolverhampton wanderers", "spurs": "tottenham hotspur", "nott m forest": "nottingham forest", "qpr": "queens park rangers",
  "inter": "internazionale", "milan": "ac milan", "roma": "as roma", "sheffield united": "sheffield united", "newcastle": "newcastle united",   "la coruna": "deportivo la coruna", "fc koln": "koln", "espanol": "espanyol",
};
const canon = (name) => { const k = (name ?? "").toLowerCase().trim(); return norm(ALIAS[k] ?? name); };
const score = (a, b) => { const A = new Set(a), B = new Set(b); let inter = 0; for (const w of A) if (B.has(w)) inter++; return inter / Math.max(1, Math.min(A.size, B.size)); };

let state = { map: {}, done: [], unmatched: {} };
if (existsSync("src/lib/soccer-espn-map.json")) state = JSON.parse(readFileSync("src/lib/soccer-espn-map.json", "utf8"));
const done = new Set(state.done);

for (const [lg, code] of Object.entries(LEAGUES)) {
  if (ONLY && lg !== ONLY) continue;
  const seasons = JSON.parse(readFileSync(`src/lib/seasons/${lg}/index.json`, "utf8"));
  for (const season of seasons) {
    if (ONLY_SEASON && season !== ONLY_SEASON) continue;
    const key = `${lg}|${season}`;
    if (done.has(key)) continue;
    const games = JSON.parse(readFileSync(`src/lib/seasons/${lg}/${season}.json`, "utf8"));
    const byDate = {};
    for (const g of games) (byDate[g.date] ??= []).push(g);
    let matched = 0, total = games.length;
    for (const [date, dayGames] of Object.entries(byDate)) {
      const d = date.replace(/-/g, "");
      let evs = [];
      for (let a = 1; a <= 3 && evs.length === 0; a++) {
        try {
          const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${d}`).then((r) => r.json());
          evs = j?.events ?? [];
          if (evs.length === 0) break; // genuinely no games that day
        } catch { await sleep(2000 * a); }
      }
      for (const g of dayGames) {
        const h = canon(g.home), aw = canon(g.away);
        let best = null, bestScore = 0;
        for (const ev of evs) {
          const comps = ev?.competitions?.[0]?.competitors ?? [];
          const eh = comps.find((c) => c.homeAway === "home")?.team, ea = comps.find((c) => c.homeAway === "away")?.team;
          if (!eh || !ea) continue;
          const names = (t) => [t.displayName, t.shortDisplayName, t.name, t.location].filter(Boolean);
          const sh = Math.max(...names(eh).map((n) => score(h, norm(n))));
          const sa = Math.max(...names(ea).map((n) => score(aw, norm(n))));
          const s = sh + sa;
          if (s > bestScore) { bestScore = s; best = ev; }
        }
        if (best && bestScore >= 1.5) { state.map[g.id] = String(best.id); matched++; }
        else { state.unmatched[`${lg}|${g.home}|${g.away}`] = (state.unmatched[`${lg}|${g.home}|${g.away}`] ?? 0) + 1; }
      }
      await sleep(250);
    }
    state.done = [...new Set([...state.done, key])].sort();
    writeFileSync("src/lib/soccer-espn-map.json", JSON.stringify(state));
    console.log(`${lg} ${season}: ${matched}/${total} mapped`);
  }
}
const un = Object.entries(state.unmatched).sort((a, b) => b[1] - a[1]).slice(0, 25);
if (un.length) { console.log("\nTop unmatched team pairs (add aliases for these):"); for (const [k, n] of un) console.log(`  ${k} ×${n}`); }
console.log(`\nDone. ${Object.keys(state.map).length} games mapped.`);