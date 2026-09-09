import { readFileSync, writeFileSync } from "fs";
const leagues = process.argv.slice(2); // e.g. laliga bundesliga
const s = JSON.parse(readFileSync("src/lib/soccer-espn-map.json", "utf8"));
const before = s.done.length;
s.done = s.done.filter((k) => !leagues.some((lg) => k.startsWith(`${lg}|`)));
s.unmatched = {};
writeFileSync("src/lib/soccer-espn-map.json", JSON.stringify(s));
console.log(`Cleared ${before - s.done.length} seasons for: ${leagues.join(", ")} — rerun the mapper.`);