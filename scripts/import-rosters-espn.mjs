import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LEAGUES = [
  ["basketball", "nba"], ["football", "nfl"], ["baseball", "mlb"], ["hockey", "nhl"],
];
const TEAM_ALIASES = {
  "la clippers": "los angeles clippers",
  "washington commanders": "washington commanders",
  "st. louis blues": "st louis blues",
};
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");

const teams = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));
const teamByName = {};
for (const t of teams) {
  teamByName[norm(t.strTeam)] = t;
  if (t.strAlternate) for (const alt of t.strAlternate.split(",")) teamByName[norm(alt)] ??= t;
}
const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const byBare = {};
for (const p of players) (byBare[bare(p.strPlayer)] ??= []).push(p);

let updated = 0, unknownPlayers = 0;
for (const [sport, lg] of LEAGUES) {
  const listRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${lg}/teams?limit=40`);
  if (!listRes.ok) { console.log(`${lg}: team list HTTP ${listRes.status} — skipping league`); continue; }
  const listJ = await listRes.json();
  const espnTeams = (listJ?.sports?.[0]?.leagues?.[0]?.teams ?? []).map((x) => x.team);
  for (const et of espnTeams) {
    const key = TEAM_ALIASES[norm(et.displayName)] ?? norm(et.displayName);
    const ours = teamByName[key];
    if (!ours) { console.log(`  ⚠ no team match: "${et.displayName}" (${lg}) — add to TEAM_ALIASES`); continue; }
    const rRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${lg}/teams/${et.id}/roster`);
    if (!rRes.ok) { console.log(`  ${et.displayName}: roster HTTP ${rRes.status}`); continue; }
    const rJ = await rRes.json();
    const raw = rJ?.athletes ?? [];
    const athletes = raw.flatMap((a) => (Array.isArray(a?.items) ? a.items : [a]));
    let n = 0;
    for (const a of athletes) {
      const name = a?.displayName ?? a?.fullName ?? "";
      if (!name) continue;
      const cands = byBare[bare(name)] ?? [];
      const hit = cands.find((p) => (p.strSport ?? "") === (sport === "football" ? "American Football" : sport === "basketball" ? "Basketball" : sport === "baseball" ? "Baseball" : "Ice Hockey")) ?? cands[0];
      if (!hit) { unknownPlayers++; continue; }
      if (hit.strTeam !== ours.strTeam) {
        hit.strTeam = ours.strTeam;
        hit.idTeam = ours.idTeam;
        updated++;
      }
      if (!hit.strThumb && a?.headshot?.href) hit.strThumb = a.headshot.href;
      n++;
    }
    console.log(`${ours.strTeam}: ${n} matched`);
    await sleep(250);
  }
}
writeFileSync("src/lib/players.json", JSON.stringify(players));
console.log(`\nDone. ${updated} team assignments corrected · ${unknownPlayers} roster names not yet in our index (fed by the existing backfill flows).`);