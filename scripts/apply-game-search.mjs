// One-time setup for game search. Safe to run twice.
//   1. Builds src/lib/game-teams.json (every team name that appears in the season files).
//   2. Adds games and fights to the list builder's dropdown.
//   3. Makes every kind of list entry (player, fighter, coach, event, season, game, fight) a link on list pages.
import { readFileSync, writeFileSync, readdirSync } from "fs";

// ---------------------------------------------------------------- 1. team-name dictionary
const teams = {};
for (const lg of ["nfl", "nba", "nhl", "mlb", "epl", "laliga", "seriea", "bundesliga", "ligue1"]) {
  const names = new Set();
  for (const f of readdirSync(`src/lib/seasons/${lg}`)) {
    if (!/^\d{4}/.test(f)) continue;
    for (const g of JSON.parse(readFileSync(`src/lib/seasons/${lg}/${f}`, "utf8"))) { if (g.home) names.add(g.home); if (g.away) names.add(g.away); }
  }
  teams[lg] = [...names].sort();
}
writeFileSync("src/lib/game-teams.json", JSON.stringify(teams));
console.log(`built    src/lib/game-teams.json (${Object.values(teams).reduce((n, l) => n + l.length, 0)} team names)`);

// ---------------------------------------------------------------- 2 + 3. edits to existing pages
const L = (...lines) => lines.join("\n");
const JOBS = [
  {
    file: "src/app/lists/new/page.tsx",
    marker: "gameSugs",
    edits: [
      [L('  seasons?: { league: string; season: string; label: string }[];', '};'),
       L('  seasons?: { league: string; season: string; label: string }[];', '  fights?: { id: string; title: string; date: string; event: string }[];', '};',
         'type GameSug = { id: string; title: string; league: string; date: string; score: string; round: string };',
         'const gameDay = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };')],
      [L('  const [sugs, setSugs] = useState<SugResults>({});'),
       L('  const [sugs, setSugs] = useState<SugResults>({});', '  const [gameSugs, setGameSugs] = useState<GameSug[]>([]);')],
      [L('    if (active === null || activeText.trim().length < 2) {', '      setSugs({});', '      return;', '    }', '    const t = setTimeout(async () => {', '      try {'),
       L('    if (active === null || activeText.trim().length < 2) {', '      setSugs({});', '      setGameSugs([]);', '      return;', '    }', '    let alive = true;', '    const t = setTimeout(async () => {',
         '      fetch(`/api/game-search?limit=4&q=${encodeURIComponent(activeText)}`).then((r) => r.json())',
         '        .then((d) => { if (alive) setGameSugs(d?.games ?? []); })',
         '        .catch(() => { if (alive) setGameSugs([]); });',
         '      try {')],
      [L('        setSugs(data ?? {});', '      } catch {', '        setSugs({});', '      }', '    }, 350);', '    return () => clearTimeout(t);'),
       L('        if (alive) setSugs(data ?? {});', '      } catch {', '        if (alive) setSugs({});', '      }', '    }, 350);', '    return () => { alive = false; clearTimeout(t); };')],
      [L('    setItem(i, e);', '    setSugs({});'),
       L('    setItem(i, e);', '    setSugs({});', '    setGameSugs([]);')],
      [L('          Rank anything: teams, players, fighters, coaches, events, seasons'),
       L('          Rank anything: games, fights, teams, players, fighters, coaches, events, seasons')],
      [L('                  (sugs.teams?.length || sugs.players?.length || sugs.fighters?.length || sugs.coaches?.length || sugs.events?.length || sugs.seasons?.length) ? ('),
       L('                  (gameSugs.length || sugs.fights?.length || sugs.teams?.length || sugs.players?.length || sugs.fighters?.length || sugs.coaches?.length || sugs.events?.length || sugs.seasons?.length) ? (')],
      [L('      ) : (', '        <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs">{fallback}</div>', '      )}'),
       L('      ) : fallback ? (', '        <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs">{fallback}</div>', '      ) : null}')],
      [L('                      {(sugs.teams ?? []).length > 0 && (', '                        <Section title="Teams">'),
       L('                      {gameSugs.length > 0 && (',
         '                        <Section title="Games">',
         '                          {gameSugs.map((g) => (',
         '                            <Row key={g.id} fallback="" label={g.title} sub={`${gameDay(g.date)}  ${g.score}`}',
         '                              onClick={() => pick(i, { label: `${g.title} (${gameDay(g.date)})`, entityType: "game", entityId: g.id })} />',
         '                          ))}',
         '                        </Section>',
         '                      )}',
         '                      {(sugs.teams ?? []).length > 0 && (', '                        <Section title="Teams">')],
      [L('                      {(sugs.coaches ?? []).length > 0 && (', '                        <Section title="Coaches">'),
       L('                      {(sugs.fights ?? []).length > 0 && (',
         '                        <Section title="Fights">',
         '                          {sugs.fights!.slice(0, 4).map((f) => (',
         '                            <Row key={f.id} fallback="" label={f.title} sub={f.event || f.date}',
         '                              onClick={() => pick(i, { label: f.title, entityType: "game", entityId: f.id })} />',
         '                          ))}',
         '                        </Section>',
         '                      )}',
         '                      {(sugs.coaches ?? []).length > 0 && (', '                        <Section title="Coaches">')],
    ],
  },
  {
    file: "src/app/lists/[id]/page.tsx",
    marker: "itemHref",
    edits: [
      [L('  image_url: string | null;', '};'),
       L('  image_url: string | null;', '};', '',
         '// Where a list entry links to. Free-text entries (no id) stay plain text.',
         'function itemHref(it: ItemRow): string | null {',
         '  const id = it.entity_id;',
         '  if (!id) return null;',
         '  if (it.entity_type === "team") return `/team/${id}`;',
         '  if (it.entity_type === "player") return `/player/${id}`;',
         '  if (it.entity_type === "fighter") return `/fighter/${id}`;',
         '  if (it.entity_type === "coach") return /^\\d+$/.test(id) ? `/player/${id}` : /^[a-z0-9-]+$/.test(id) ? `/coach/${id}` : null;',
         '  if (it.entity_type === "event") return `/event/${id}`;',
         '  if (it.entity_type === "game") return `/game/${id}`;',
         '  if (it.entity_type === "season") { const cut = id.indexOf("-"); return cut > 0 ? `/seasons/${id.slice(0, cut)}/${id.slice(cut + 1)}` : null; }',
         '  return null;',
         '}')],
      [L('              {it.entity_type === "team" && it.entity_id ? (', '                <Link href={`/team/${it.entity_id}`} className="font-medium hover:text-accent">'),
       L('              {itemHref(it) ? (', '                <Link href={itemHref(it)!} className="font-medium hover:text-accent">')],
    ],
  },
];

let changed = 0, problems = 0;
for (const job of JOBS) {
  let text;
  try { text = readFileSync(job.file, "utf8"); }
  catch { console.log(`PROBLEM  ${job.file}: file not found`); problems++; continue; }
  if (text.includes(job.marker)) { console.log(`already done  ${job.file}`); continue; }
  const missing = job.edits.findIndex(([find]) => text.split(find).length !== 2);
  if (missing >= 0) { console.log(`PROBLEM  ${job.file}: did not find what I expected (edit ${missing + 1} of ${job.edits.length}); nothing in this file was changed`); problems++; continue; }
  for (const [find, replace] of job.edits) text = text.replace(find, () => replace);
  writeFileSync(job.file, text);
  console.log(`updated  ${job.file}`);
  changed++;
}
console.log(problems ? `\n${problems} file(s) had a problem. Paste this whole output to Claude.` : `\nDone: ${changed} file(s) updated.`);