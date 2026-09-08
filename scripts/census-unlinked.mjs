import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
const norm = (n) => (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bare = (n) => norm(n).replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
const initKey = (full) => {
  const parts = norm(full).split(" ").filter(Boolean);
  return parts.length >= 2 ? `${parts[0][0]} ${parts.slice(1).join(" ")}` : norm(full);
};

const players = JSON.parse(readFileSync("src/lib/players.json", "utf8"));
const SPORT = { nba: "Basketball", nfl: "American Football", mlb: "Baseball", nhl: "Ice Hockey" };
const byLeague = {};
for (const lg of Object.keys(SPORT)) {
  byLeague[lg] = { exact: new Map(), initials: new Map() };
  for (const p of players) {
    if ((p.strSport ?? "") !== SPORT[lg]) continue;
    byLeague[lg].exact.set(norm(p.strPlayer), p.idPlayer);
    byLeague[lg].exact.set(bare(p.strPlayer), p.idPlayer);
    const k = initKey(p.strPlayer);
    byLeague[lg].initials.set(k, byLeague[lg].initials.has(k) ? "AMBIG" : p.idPlayer);
  }
}
const MISSING_FILES = { nba: "nba-missing-players.json", nfl: "nfl-missing-players.json", mlb: "mlb-missing-players.json", nhl: "nhl-missing-players.json" };
const ID_KEY = { nba: "nbaId", nfl: "nflId", mlb: "mlbId", nhl: "nhlId" };
for (const lg of Object.keys(MISSING_FILES)) {
  try {
    const mf = JSON.parse(readFileSync(`src/lib/${MISSING_FILES[lg]}`, "utf8"));
    for (const m of mf) {
      const gid = `${lg}-${m[ID_KEY[lg]]}`;
      byLeague[lg].exact.set(norm(m.name), gid);
      byLeague[lg].exact.set(bare(m.name), gid);
      const k = initKey(m.name);
      byLeague[lg].initials.set(k, byLeague[lg].initials.has(k) ? "AMBIG" : gid);
    }
  } catch { /* file absent */ }
}
// universes, for pile-1 recovery + pile-2 candidate listings
const UNIV = {};
for (const [lg, file] of [["nba","nba-player-ids.json"],["nfl","nfl-player-ids.json"],["mlb","mlb-player-ids.json"],["nhl","nhl-player-ids.json"]]) {
  try { UNIV[lg] = JSON.parse(readFileSync(`src/lib/${file}`, "utf8")); } catch { UNIV[lg] = null; }
}

const resolve = (lg, name) => {
  const L = byLeague[lg];
  const n = norm(name), b = bare(name);
  if (L.exact.get(n) || L.exact.get(b)) return "linked";
  const k = n.replace(/^([a-z])\s*\.?\s+/, "$1 ");
  const hit = L.initials.get(k);
  if (hit && hit !== "AMBIG") return "linked";
  return hit === "AMBIG" ? "ambiguous" : "unknown";
};

const unlinked = {}; // name|lg -> { name, lg, count, kind, candidates }
const scanBox = (lg, box) => {
  for (const grp of box.groups ?? []) {
    for (const row of grp.rows ?? []) {
      if (!row.name) continue;
      const kind = resolve(lg, row.name);
      if (kind === "linked") continue;
      const key = `${lg}|${norm(row.name)}`;
      if (!unlinked[key]) {
        let candidates = [];
        if (UNIV[lg]?.names) {
          const k = norm(row.name).replace(/^([a-z])\s*\.?\s+/, "$1 ");
          const parts = k.split(" ");
          const surname = parts.slice(1).join(" ");
          const init = parts[0];
          candidates = Object.entries(UNIV[lg].names)
            .filter(([, un]) => {
              const up = norm(un).split(" ");
              return up.length >= 2 && up.slice(1).join(" ") === surname && (parts.length < 2 || up[0][0] === init);
            })
            .map(([uid, un]) => `${un} (${uid})`);
        }
        unlinked[key] = { name: row.name, lg, count: 0, kind, candidates };
      }
      unlinked[key].count++;
    }
  }
};

// walk every box score store on disk
const stores = [];
if (existsSync("src/lib/boxscores/nfl-legacy.json")) stores.push(["nfl", "src/lib/boxscores/nfl-legacy.json"]);
if (existsSync("src/lib/boxscores/nba")) for (const f of readdirSync("src/lib/boxscores/nba").filter((x) => x.endsWith(".json"))) stores.push(["nba", `src/lib/boxscores/nba/${f}`]);
for (const [lg, file] of stores) {
  const store = JSON.parse(readFileSync(file, "utf8"));
  for (const box of Object.values(store)) { if (!box.unavailable) scanBox(lg, box); }
}
console.log("NOTE: MLB/NHL box scores are fetched live (not on disk) — their census runs from a sample below.");

const all = Object.values(unlinked).sort((a, b) => b.count - a.count);
const p1 = all.filter((x) => x.kind === "unknown" && x.candidates.length === 1);
const p2 = all.filter((x) => x.kind === "ambiguous" || x.candidates.length > 1);
const p3 = all.filter((x) => x.kind === "unknown" && x.candidates.length === 0);
writeFileSync("census-report.json", JSON.stringify({ pile1_autofixable: p1, pile2_needs_decision: p2, pile3_no_data: p3 }, null, 2));
console.log(`\nCensus (disk stores): ${all.length} distinct unlinked names`);
console.log(`  Pile 1 — auto-fixable (unique universe match): ${p1.length}`);
console.log(`  Pile 2 — ambiguous (needs a human call): ${p2.length}`);
console.log(`  Pile 3 — no data anywhere: ${p3.length}`);
console.log(`Full detail written to census-report.json`);
console.log(`\nTop 20 by appearances:`);
for (const x of all.slice(0, 20)) console.log(`  [${x.lg}] ${x.name} ×${x.count} — ${x.kind}${x.candidates.length ? ` — candidates: ${x.candidates.slice(0, 3).join("; ")}` : ""}`);