import { readFileSync, writeFileSync } from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let state = { done: [], names: {}, meta: {} };
try { state = JSON.parse(readFileSync("src/lib/mlb-player-ids.json", "utf8")); } catch {}
const done = new Set(state.done);

const thisYear = new Date().getFullYear();
const seasons = [];
for (let y = 1901; y <= thisYear; y++) seasons.push(y);

for (const season of seasons) {
  if (done.has(season)) continue;
  let j = null;
  for (let a = 1; a <= 3 && j === null; a++) {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/sports/1/players?season=${season}`);
      if (!res.ok) { await sleep(4000 * a); continue; }
      j = await res.json();
    } catch { await sleep(4000 * a); }
  }
  if (!j) { console.log(`Stopping at ${season} — rerun to resume.`); break; }
  let added = 0;
  for (const p of j?.people ?? []) {
    const id = String(p.id);
    if (!state.names[id]) added++;
    state.names[id] = p.fullName ?? "";
    const m = (state.meta[id] ??= { first: season, last: season });
    if (season < m.first) m.first = season;
    if (season > m.last) m.last = season;
  }
  state.done = [...new Set([...state.done, season])].sort();
  writeFileSync("src/lib/mlb-player-ids.json", JSON.stringify(state));
  console.log(`${season}: +${added} new (${Object.keys(state.names).length} total)`);
  await sleep(600);
}
console.log(`\nDone. ${Object.keys(state.names).length} unique MLB players.`);