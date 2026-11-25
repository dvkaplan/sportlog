// NBA schedule + scores.
//
//   node scripts/import-nba-games.mjs              current season, from ESPN (works from the nightly bot)
//   node scripts/import-nba-games.mjs --current    same thing (the flag the nightly bot passes)
//   node scripts/import-nba-games.mjs --full       current season, and re-check every future date too
//   node scripts/import-nba-games.mjs --history    old seasons from stats.nba.com (LAPTOP ONLY — blocked in the cloud)
//
// Current-season mode is additive: it never removes a game that already has a score,
// and it writes nothing at all if ESPN can't be reached.
import { writeFileSync, mkdirSync, readFileSync } from "fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = "src/lib/seasons/nba";
const MAP_FILE = "src/lib/nba-espn-map.json";
const seasonStr = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; } };

// Game dates are US Eastern calendar dates, the same as every earlier season on file.
const etDate = (d) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

mkdirSync(DIR, { recursive: true });
const TODAY = etDate(new Date());
const START_YEAR = Number(TODAY.slice(5, 7)) >= 9 ? Number(TODAY.slice(0, 4)) : Number(TODAY.slice(0, 4)) - 1; // season turns over in September
const CURRENT = seasonStr(START_YEAR);
const FIRST_ESPN_YEAR = 2026; // 2026-27 onward comes from ESPN; --history never touches those seasons

if (process.argv.includes("--history")) await importHistory();
else await importCurrent();

// ---------------------------------------------------------------- current season (ESPN)
async function importCurrent() {
  const file = `${DIR}/${CURRENT}.json`;
  const existing = readJson(file, []);
  const seasonStart = `${START_YEAR}-10-01`;
  const seasonEnd = `${START_YEAR + 1}-06-30`;

  // Official team names come from last season's file, so names always match the rest of the site
  // and anything that isn't one of the 30 teams (All-Star teams, overseas exhibitions) is skipped.
  const nick = (name) => (name ?? "").trim().split(/\s+/).pop().toLowerCase();
  const canon = {};
  for (const g of readJson(`${DIR}/${seasonStr(START_YEAR - 1)}.json`, [])) { canon[nick(g.home)] ??= g.home; canon[nick(g.away)] ??= g.away; }
  for (const g of existing) { canon[nick(g.home)] ??= g.home; canon[nick(g.away)] ??= g.away; }
  if (Object.keys(canon).length < 30) { fail(`could not load team names (found ${Object.keys(canon).length})`); return; }

  // Every game already on file, keyed by its ESPN event id (the last part of our game id).
  const byEspn = new Map(existing.map((g) => [g.id.split("-").slice(2).join("-"), g]));

  // Which dates to ask ESPN about.
  const scoredDates = existing.filter((g) => g.hs != null && g.as != null).map((g) => g.date).sort();
  const stuckDates = existing.filter((g) => (g.hs == null || g.as == null) && g.date < TODAY).map((g) => g.date).sort();
  let from = scoredDates.length ? addDays(scoredDates[scoredDates.length - 1], -3) : seasonStart;
  if (stuckDates.length && stuckDates[0] < from) from = stuckDates[0];
  if (from < seasonStart) from = seasonStart;
  const hasFarFuture = existing.some((g) => g.date > addDays(TODAY, 14));
  const fullSweep = process.argv.includes("--full") || !hasFarFuture || new Date().getUTCDay() === 1; // first run, or weekly on Mondays
  const to = fullSweep ? seasonEnd : (addDays(TODAY, 14) < seasonEnd ? addDays(TODAY, 14) : seasonEnd);
  const dates = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  if (dates.length === 0) { console.log(`${CURRENT}: nothing to fetch (season window is ${seasonStart} to ${seasonEnd}).`); return; }
  console.log(`${CURRENT}: checking ${dates.length} dates, ${from} to ${to}${fullSweep ? " (full schedule sweep)" : ""}…`);

  const seen = new Set();      // ESPN ids seen this run
  const fetched = new Set();   // dates ESPN answered for
  const unknownTeams = {};     // name -> games skipped (a real franchise shows up many times; All-Star teams don't)
  const espnMap = {};          // our id -> ESPN id, for box scores
  let added = 0, updated = 0, dropped = 0, stopped = false;

  for (const d of dates) {
    const j = await getDay(d);
    if (!j) { stopped = true; console.log(`  ESPN did not answer for ${d} — stopping here; the next run resumes from this point.`); break; }
    fetched.add(d);
    for (const ev of j.events ?? []) {
      const comp = ev?.competitions?.[0];
      const stype = Number(ev?.season?.type ?? j?.season?.type);
      if (stype !== 2 && stype !== 3) continue; // regular season and playoffs only (no preseason / play-in), same as earlier seasons
      const headline = (comp?.notes ?? []).map((n) => n?.headline ?? "").join(" ");
      if (/play-in/i.test(headline) || /cup\b.*\b(championship|final)\b/i.test(headline)) continue; // not counted in records
      const home = (comp?.competitors ?? []).find((c) => c.homeAway === "home");
      const away = (comp?.competitors ?? []).find((c) => c.homeAway === "away");
      const hName = canon[nick(home?.team?.displayName)], aName = canon[nick(away?.team?.displayName)];
      if (!hName || !aName) {
        for (const n of [home?.team?.displayName, away?.team?.displayName]) if (n && !canon[nick(n)] && !/^(tbd|tba)$/i.test(n)) unknownTeams[n] = (unknownTeams[n] ?? 0) + 1;
        continue;
      }
      const st = comp?.status?.type ?? ev?.status?.type ?? {};
      const espnId = String(ev.id);
      const old = byEspn.get(espnId);
      if (/POSTPONED|CANCELED|CANCELLED/i.test(st.name ?? "")) {
        if (old && old.hs == null) { byEspn.delete(espnId); dropped++; }
        continue;
      }
      seen.add(espnId);
      const date = etDate(new Date(ev.date));
      const final = st.completed === true && home.score != null && away.score != null && home.score !== "" && away.score !== "";
      const period = Number(comp?.status?.period ?? ev?.status?.period ?? 0);
      const g = old ?? { id: `nba-${date.slice(0, 4)}-${espnId}`, date, type: "REG", home: hName, away: aName, hs: null, as: null };
      const before = JSON.stringify(g);
      g.type = stype === 3 ? "PO" : "REG";
      g.home = hName; g.away = aName;
      if (final) { g.date = date; g.hs = Number(home.score); g.as = Number(away.score); if (period > 4) g.ot = true; }
      else if (g.hs == null) g.date = date; // a game with a score on file is never un-scored or moved
      if (!old) { byEspn.set(espnId, g); added++; } else if (JSON.stringify(g) !== before) updated++;
      espnMap[g.id] = espnId;
    }
    await sleep(200);
  }

  if (fetched.size === 0) { fail("ESPN could not be reached — nothing was changed"); return; }

  // An unplayed game that ESPN no longer lists on a date we just checked has been moved or scrapped.
  for (const [espnId, g] of byEspn) {
    if (g.hs == null && fetched.has(g.date) && !seen.has(espnId)) { byEspn.delete(espnId); dropped++; }
  }

  const out = [...byEspn.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const scoredBefore = existing.filter((g) => g.hs != null).length, scoredAfter = out.filter((g) => g.hs != null).length;
  if (scoredAfter < scoredBefore) { fail(`refusing to write: scored games would drop from ${scoredBefore} to ${scoredAfter}`); return; }
  writeFileSync(file, JSON.stringify(out));
  const index = readJson(`${DIR}/index.json`, []);
  writeFileSync(`${DIR}/index.json`, JSON.stringify([...new Set([...index, CURRENT])].sort()));

  // Box scores: the game page looks up the ESPN event id in this map.
  const state = readJson(MAP_FILE, { done: [], map: {} });
  state.map = { ...(state.map ?? {}), ...espnMap };
  writeFileSync(MAP_FILE, JSON.stringify(state));

  const latest = out.filter((g) => g.hs != null).map((g) => g.date).sort().pop() ?? "none yet";
  console.log(`${CURRENT}: ${out.length} games on file, ${scoredAfter} with scores (latest ${latest}), ${out.length - scoredAfter} upcoming ✓`);
  console.log(`  this run: +${added} new, ${updated} updated, ${dropped} removed (postponed/moved)`);
  const strangers = Object.entries(unknownTeams).filter(([, n]) => n >= 5).map(([name]) => name);
  if (strangers.length) console.log(`::warning::NBA import skipped games for team names it does not know: ${strangers.join(", ")}`);
  if (stopped) console.log("::warning::NBA import stopped early (ESPN stopped answering); it will resume on the next run.");
}

async function getDay(d) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d.replace(/-/g, "")}&limit=100`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
      console.log(`  ${d}: HTTP ${res.status} (attempt ${attempt})`);
    } catch { console.log(`  ${d}: network fail (attempt ${attempt})`); }
    await sleep(2000 * attempt);
  }
  return null;
}

// Shows up as a yellow warning on the GitHub Actions run page. Exit code stays 0 so the
// importers that run after this one in the nightly workflow are not skipped.
function fail(msg) { console.log(`::warning::NBA import: ${msg}`); }

// ---------------------------------------------------------------- old seasons (stats.nba.com, laptop only)
async function importHistory() {
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    Referer: "https://www.nba.com/",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    Accept: "application/json",
  };
  let index = readJson(`${DIR}/index.json`, []);
  const done = new Set(index);
  for (let y = FIRST_ESPN_YEAR - 1; y >= 1946; y--) {
    const season = seasonStr(y);
    if (done.has(season)) continue;
    const games = {};
    let ok = true;
    for (const type of ["Regular Season", "Playoffs"]) {
      const url = `https://stats.nba.com/stats/leaguegamelog?Counter=0&DateFrom=&DateTo=&Direction=DESC&LeagueID=00&PlayerOrTeam=T&Season=${encodeURIComponent(season)}&SeasonType=${encodeURIComponent(type)}&Sorter=DATE`;
      try {
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
        if (!res.ok) { console.log(`${season} ${type}: HTTP ${res.status}`); ok = false; break; }
        const j = await res.json();
        const rs = j?.resultSets?.[0];
        const h = rs?.headers ?? [];
        const c = (n) => h.indexOf(n);
        for (const r of rs?.rowSet ?? []) {
          const gid = r[c("GAME_ID")];
          const matchup = r[c("MATCHUP")] ?? ""; // "LAL @ BOS" away perspective, "LAL vs. BOS" home
          const isAway = matchup.includes("@");
          const team = r[c("TEAM_NAME")], pts = r[c("PTS")], date = r[c("GAME_DATE")];
          games[gid] ??= { id: `nba-${date?.slice(0, 4)}-${gid}`, date, type: type === "Playoffs" ? "PO" : "REG", home: null, away: null, hs: null, as: null };
          const g = games[gid];
          if (isAway) { g.away = team; g.as = pts; } else { g.home = team; g.hs = pts; }
        }
        await sleep(1500);
      } catch { console.log(`${season} ${type}: network fail`); ok = false; break; }
    }
    if (!ok) { console.log(`Stopping at ${season}.`); break; }
    const arr = Object.values(games).filter((g) => g.home && g.away);
    if (arr.length === 0) { console.log(`${season}: no games returned — skipped`); continue; }
    writeFileSync(`${DIR}/${season}.json`, JSON.stringify(arr));
    index = [...new Set([...index, season])].sort();
    writeFileSync(`${DIR}/index.json`, JSON.stringify(index));
    console.log(`${season}: ${arr.length} games ✓`);
  }
  console.log("History done (or stopped).");
}