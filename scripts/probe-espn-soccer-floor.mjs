const LEAGUES = { epl: "eng.1", laliga: "esp.1", seriea: "ita.1", bundesliga: "ger.1", ligue1: "fra.1" };
for (const [lg, code] of Object.entries(LEAGUES)) {
  let floor = null;
  for (let y = 1995; y <= 2010 && !floor; y++) {
    // sample several Saturdays across the autumn of season y-(y+1)
    for (const md of ["0916", "1014", "1111", "1209"]) {
      const d = `${y}${md}`;
      // find the actual Saturday nearest that date
      const dt = new Date(`${y}-${md.slice(0, 2)}-${md.slice(2)}`);
      dt.setDate(dt.getDate() + ((6 - dt.getDay() + 7) % 7));
      const ds = dt.toISOString().slice(0, 10).replace(/-/g, "");
      try {
        const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${ds}`).then((r) => r.json());
        if ((j?.events ?? []).length > 0) { floor = `${y}-${String(y + 1).slice(2)}`; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  console.log(`${lg}: earliest season with ESPN data = ${floor ?? "none found through 2010"}`);
}