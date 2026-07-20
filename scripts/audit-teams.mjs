import { readFileSync } from "fs";

const teams = JSON.parse(readFileSync("src/lib/teams.json", "utf8"));

const counts = {};
for (const t of teams) {
  counts[t.strLeague] = (counts[t.strLeague] ?? 0) + 1;
}

const EXPECTED = {
  "NBA": 30,
  "NFL": 32,
  "MLB": 30,
  "NHL": 32,
  "English Premier League": 20,
  "American Major League Soccer": 30,
  "Spanish La Liga": 20,
  "German Bundesliga": 18,
  "Italian Serie A": 20,
  "French Ligue 1": 18,
};

console.log("League coverage:");
for (const [league, expected] of Object.entries(EXPECTED)) {
  const have = counts[league] ?? 0;
  const flag = have >= expected ? "✓" : "✗";
  console.log(`${flag} ${league}: ${have}/${expected}`);
}

console.log("\nTeams currently in file, by league:");
for (const [league] of Object.entries(EXPECTED)) {
  const names = teams.filter((t) => t.strLeague === league).map((t) => t.strTeam).sort();
  console.log(`\n${league} (${names.length}):`);
  console.log(names.join(", "));
}