const LEAGUES = { epl: "eng.1", laliga: "esp.1", seriea: "ita.1", bundesliga: "ger.1", ligue1: "fra.1" };
// one Saturday in each of three eras — tests coverage depth
const DATES = ["20240309", "20120310", "20031108"];
for (const [key, code] of Object.entries(LEAGUES)) {
  for (const d of DATES) {
    try {
      const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${d}`).then((r) => r.json());
      const evs = j?.events ?? [];
      console.log(`${key} ${d}: ${evs.length} events${evs[0] ? ` — e.g. ${evs[0].name} (id ${evs[0].id})` : ""}`);
    } catch (e) { console.log(`${key} ${d}: FAILED ${e.message}`); }
  }
}
// dig into one modern EPL match to see what a summary actually contains
const sb = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20240309`).then((r) => r.json());
const ev = sb?.events?.[0];
if (ev) {
  const s = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${ev.id}`).then((r) => r.json());
  console.log(`\nSUMMARY for ${ev.name}:`);
  console.log("  top-level keys:", Object.keys(s).join(", "));
  const r0 = s?.rosters?.[0];
  console.log("  rosters:", s?.rosters?.length ?? 0, "teams;", r0 ? `first team ${r0.team?.displayName}, ${r0.roster?.length} players` : "none");
  const p0 = r0?.roster?.[0];
  if (p0) {
    console.log("  sample player keys:", Object.keys(p0).join(", "));
    console.log("  sample athlete:", JSON.stringify(p0.athlete ?? {}).slice(0, 200));
    console.log("  sample stats:", JSON.stringify(p0.stats ?? []).slice(0, 300));
  }
  console.log("  keyEvents:", s?.keyEvents?.length ?? 0);
  // career stats endpoint for that athlete
  if (p0?.athlete?.id) {
    const cs = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/eng.1/athletes/${p0.athlete.id}/stats`).then((r) => r.json()).catch(() => null);
    console.log("  career stats endpoint:", cs ? `ok — keys: ${Object.keys(cs).join(", ")}; categories: ${cs?.categories?.length ?? 0}` : "FAILED");
  }
}