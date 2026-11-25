// One-time edit: makes the review lists on game, event, season and player/coach/fighter pages
// use the new clickable ReviewList (likes + comments). Safe to run twice.
import { readFileSync, writeFileSync } from "fs";

const JOBS = [
  { file: "src/app/game/[id]/page.tsx", after: 'import BoxScore from "@/components/BoxScore";', kind: "game", extra: "" },
  { file: "src/app/event/[slug]/page.tsx", after: 'import BackLink from "@/components/BackLink";', kind: "game", extra: "" },
  { file: "src/components/EntityRatingBox.tsx", after: 'import { supabase } from "@/lib/supabase";', kind: "entity", extra: "" },
  { file: "src/components/SeasonRating.tsx", after: 'import { supabase } from "@/lib/supabase";', kind: "game", extra: " heading={false}" },
];
const IMPORT = 'import ReviewList from "@/components/Reviews";';
let changed = 0, problems = 0;

for (const job of JOBS) {
  let lines;
  try { lines = readFileSync(job.file, "utf8").split("\n"); }
  catch { console.log(`PROBLEM  ${job.file}: file not found`); problems++; continue; }
  if (lines.some((l) => l.includes(IMPORT))) { console.log(`already done  ${job.file}`); continue; }

  const importAt = lines.findIndex((l) => l.trim() === job.after);
  const starts = lines.map((l, i) => (l.trim() === "{reviews.length > 0 && (" ? i : -1)).filter((i) => i >= 0);
  if (importAt < 0 || starts.length !== 1) { console.log(`PROBLEM  ${job.file}: did not find what I expected (import line ${importAt}, review blocks ${starts.length})`); problems++; continue; }
  const start = starts[0];
  const indent = lines[start].match(/^\s*/)[0];
  const end = lines.findIndex((l, i) => i > start && l === `${indent})}`);
  const block = end < 0 ? "" : lines.slice(start, end + 1).join("\n");
  if (end < 0 || end - start > 20 || !block.includes("reviews.map(") || !block.includes("{r.review}")) { console.log(`PROBLEM  ${job.file}: the review block does not look the way I expected`); problems++; continue; }

  lines.splice(start, end - start + 1, `${indent}<ReviewList kind="${job.kind}" reviews={reviews} names={names} userId={userId}${job.extra} />`);
  lines.splice(importAt + 1, 0, IMPORT);
  writeFileSync(job.file, lines.join("\n"));
  console.log(`updated  ${job.file}`);
  changed++;
}
console.log(problems ? `\n${problems} file(s) had a problem. Paste this whole output to Claude.` : `\nDone: ${changed} file(s) updated.`);