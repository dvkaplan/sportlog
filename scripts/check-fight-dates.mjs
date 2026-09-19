import { readFileSync } from "fs";
const f = JSON.parse(readFileSync("src/lib/fight-games.json", "utf8"));
const dates = f.map((x) => Date.parse(x.date)).filter((t) => Number.isFinite(t)).sort((a, b) => b - a);
console.log("newest:", dates.slice(0, 3).map((t) => new Date(t).toISOString().slice(0, 10)));
console.log("total fights:", f.length, "| with parseable dates:", dates.length);