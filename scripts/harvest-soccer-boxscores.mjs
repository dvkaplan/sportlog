import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CODES = { epl: "eng.1", laliga: "esp.1", seriea: "ita.1", bundesliga: "ger.1", ligue1: "fra.1" };
const ONLY = process.argv[2] ?? null;
const ONLY_SEASON = process.argv[3] ?? null;

const map = JSON.parse(readFileSync("src/lib/soccer-espn-map.json", "utf8")).map;
mkdirSync("src/lib/boxscores/soccer", { recursive: true });
let univ = { names: {}, meta: {} };
if (existsSync("src/lib/soccer-player-ids.json")) univ = JSON.parse(readFileSync("src/lib/soccer-player-ids.json", "utf8"));

for (const lg of Object.keys(CODES)) {
  if (ONLY && lg !== ONLY) continue;
  const seasons = JSON.parse(readFileSync(`src/lib/seasons/${lg}/index.json`, "utf8"));
  for (const season of seasons) {
    if (ONLY_SEASON && season !== ONLY_SEASON) continue;
    const file = `src/lib/boxscores/soccer/${lg}-${season}.json`;
    const store = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    const games = JSON.parse(readFileSync(`src/lib/seasons/${lg}/${season}.json`, "utf8")).filter((g) => map[g.id]);
    if (games.length === 0) { continue; }
    let fetched = 0, i = 0;
    for (const g of games) {
      i++;
      if (store[g.id]) continue;
      let j = null;
      for (let a = 1; a <= 3 && j === null; a++) {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${CODES[lg]}/summary?event=${map[g.id]}`);
          if (res.status === 429 || res.status >= 500) { await sleep(5000 * a); continue; }
          if (!res.ok) break;
          j = await res.json();
        } catch { await sleep(3000 * a); }
      }
      if (!j) { store[g.id] = { unavailable: true }; continue; }
      const yr = g.date.slice(0, 4);
      const rosters = (j?.rosters ?? []).map((r) => ({
        team: r.team?.displayName ?? "", homeAway: r.homeAway ?? "",
        roster: (r.roster ?? []).filter((p) => p.starter || p.subbedIn).map((p) => {
          const id = String(p.athlete?.id ?? ""), name = p.athlete?.displayName ?? "";
          if (id && name) {
            univ.names[id] = name;
            const m = (univ.meta[id] ??= { first: yr, last: yr, games: 0, teams: [] });
            m.games++; if (yr < m.first) m.first = yr; if (yr > m.last) m.last = yr;
            const t = r.team?.displayName ?? ""; if (t && !m.teams.includes(t) && m.teams.length < 8) m.teams.push(t);
          }
          return { id, name, jersey: p.jersey ?? "", starter: !!p.starter, subbedIn: !!p.subbedIn, pos: p.athlete?.position?.abbreviation ?? "",
            stats: (p.stats ?? []).map((s) => [s.abbreviation ?? "", s.displayValue ?? ""]) };
        }),
      }));
      store[g.id] = { rosters };
      fetched++;
      if (fetched % 25 === 0) { writeFileSync(file, JSON.stringify(store)); writeFileSync("src/lib/soccer-player-ids.json", JSON.stringify(univ)); }
      await sleep(250);
    }
    writeFileSync(file, JSON.stringify(store));
    writeFileSync("src/lib/soccer-player-ids.json", JSON.stringify(univ));
    console.log(`${lg} ${season}: ${fetched} fetched (${Object.keys(store).length}/${games.length} on disk) · universe ${Object.keys(univ.names).length}`);
  }
}
console.log(`\nDone. ${Object.keys(univ.names).length} soccer players in universe.`);