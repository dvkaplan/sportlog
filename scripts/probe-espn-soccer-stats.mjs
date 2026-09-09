const id = "195226";
for (const q of ["?league=eng.1&team=360", "?league=ita.1&team=109", "?league=eng.1"]) {
  const u = `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${id}/stats${q}`;
  const j = await fetch(u).then((r) => r.json()).catch(() => null);
  console.log(`\n${q} → keys: ${j ? Object.keys(j).join(", ") : "FAILED"}`);
  if (j?.categories) {
    for (const c of j.categories) console.log(`  category "${c.displayName ?? c.name}": labels=${(c.labels ?? c.names ?? []).slice(0, 12).join(",")} | seasons=${c.statistics?.length ?? 0} | totals=${(c.totals ?? []).slice(0, 8).join(",")}`);
  } else if (j) {
    console.log("  sample:", JSON.stringify(j).slice(0, 600));
  }
}