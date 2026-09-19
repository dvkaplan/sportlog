import { writeFileSync } from "fs";
const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;
const LEAGUES = { nfl: 4391, nba: 4387, mlb: 4424, nhl: 4380, epl: 4328, laliga: 4335, seriea: 4332, bundesliga: 4331, ligue1: 4334, ufc: 4443 };
const out = {};
for (const [key, id] of Object.entries(LEAGUES)) {
  const j = await fetch(`${BASE}/lookupleague.php?id=${id}`).then((r) => r.json());
  const l = j?.leagues?.[0];
  out[key] = { name: l?.strLeague ?? key, badge: l?.strBadge ?? null, logo: l?.strLogo ?? null, sport: l?.strSport ?? null };
  console.log(key, "→", l?.strLeague, out[key].badge ? "badge ✓" : "no badge");
  await new Promise((r) => setTimeout(r, 400));
}
writeFileSync("src/lib/leagues.json", JSON.stringify(out, null, 2));