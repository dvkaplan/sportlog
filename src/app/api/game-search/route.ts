import { readFile, readdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import gameTeams from "@/lib/game-teams.json";

// Finds individual league games (NFL, NBA, NHL, MLB, soccer) from a typed search.
// To keep search uncluttered it only answers when the text is shaped like a game:
//   two teams ............ "lakers celtics", "chiefs at bills", "bulls jazz 1998"
//   a team + a year ...... "yankees 1998", "patriots 2007 playoffs"
//   a named final ........ "super bowl 2015", "world series 2016", "nba finals 2016"
// Anything else ("lakers", "lebron james") returns no games.

type Game = { id: string; date: string; away: string; home: string; as: number; hs: number; type: string; ot: boolean; season: string };
type TeamRef = { lg: string; name: string };
type GameHit = { id: string; title: string; league: string; date: string; score: string; round: string };

const LG: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };
const ROUND: Record<string, string> = { WC: "Wild Card", DIV: "Divisional Round", CON: "Conference Championship", SB: "Super Bowl", CHAMP: "Championship", WS: "World Series", PO: "Playoffs" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// ---- team names people type -> the teams they could mean
const GENERIC = new Set(["new", "los", "las", "san", "st", "la", "ft", "city", "united", "real", "fc", "de", "the", "bay", "state", "golden", "red", "blue", "white", "north", "south", "town", "sp", "ath", "west", "east", "green", "tri", "cities", "trail", "maple", "man", "nott", "m"]);
const ALIAS = new Map<string, TeamRef[]>();
function addAlias(key: string, ref: TeamRef) {
  if (!key || /^\d+$/.test(key) && key.length === 4) return;
  const list = ALIAS.get(key);
  if (!list) ALIAS.set(key, [ref]);
  else if (!list.some((r) => r.lg === ref.lg && r.name === ref.name)) list.push(ref);
}
function addTeam(lg: string, name: string) {
  const words = norm(name).split(" ").filter(Boolean);
  const ref = { lg, name };
  for (let i = 0; i < words.length; i++) { // "los angeles lakers", "angeles lakers", "lakers"
    const key = words.slice(i).join(" ");
    if (key.includes(" ") || !GENERIC.has(key)) addAlias(key, ref);
  }
  for (let j = 1; j < words.length; j++) { // "los angeles", "boston"
    const key = words.slice(0, j).join(" ");
    if (key.includes(" ") || (!GENERIC.has(key) && key.length >= 4)) addAlias(key, ref);
  }
}
for (const [lg, names] of Object.entries(gameTeams as Record<string, string[]>)) for (const n of names) addTeam(lg, n);
for (const key of ["los angeles clippers", "la clippers"]) for (const name of ["LA Clippers", "Los Angeles Clippers"]) addAlias(key, { lg: "nba", name }); // one team, two spellings

// Everyday nicknames -> the wording used in the data.
const NICK: [RegExp, string][] = [
  [/\bsixers\b/g, "76ers"], [/\bniners\b/g, "49ers"], [/\bsonics\b/g, "supersonics"], [/\bcavs\b/g, "cavaliers"], [/\bmavs\b/g, "mavericks"],
  [/\bt ?wolves\b/g, "timberwolves"], [/\bpats\b/g, "patriots"], [/\bbucs\b/g, "buccaneers"], [/\bjags\b/g, "jaguars"], [/\bhabs\b/g, "canadiens"],
  [/\bnats\b/g, "nationals"], [/\byanks\b/g, "yankees"], [/\bd ?backs\b/g, "diamondbacks"], [/\bphilly\b/g, "philadelphia"],
  [/\bla (?=lakers|rams|chargers|dodgers|kings|angels|raiders)/g, "los angeles "], [/\bny\b/g, "new york"], [/\bsf\b/g, "san francisco"],
  [/\bkc\b/g, "kansas city"], [/\bokc\b/g, "oklahoma city"], [/\bnola\b/g, "new orleans"],
  [/\bmanchester united\b|\bman utd\b|\bman u\b/g, "man united"], [/\bmanchester city\b/g, "man city"], [/\btottenham hotspur\b/g, "tottenham"],
  [/\bnottingham forest\b/g, "nott m forest"], [/\bwolverhampton\b/g, "wolves"], [/\bpsg\b|\bparis saint germain\b/g, "paris sg"],
  [/\batletico madrid\b|\batletico\b/g, "ath madrid"], [/\bathletic bilbao\b/g, "ath bilbao"], [/\bbarca\b/g, "barcelona"],
  [/\binter milan\b/g, "inter"], [/\bac milan\b/g, "milan"], [/\bbayern\b(?! munich)/g, "bayern munich"],
];
const FILLER = new Set(["vs", "v", "versus", "at", "and", "the", "game", "games", "in", "of", "season", "match", "matchup"]);

// ---- played games, read from the season files once per server instance (the files only change on deploy)
const seasonCache = new Map<string, Promise<Game[]>>();
const listCache = new Map<string, Promise<string[]>>();
const seasonsOf = (lg: string) => {
  let p = listCache.get(lg);
  if (!p) {
    p = readdir(path.join(process.cwd(), "src", "lib", "seasons", lg)).then((fs) => fs.filter((f) => /^\d{4}/.test(f)).map((f) => f.replace(/\.json$/, ""))).catch(() => []);
    listCache.set(lg, p);
  }
  return p;
};
function loadSeason(lg: string, season: string): Promise<Game[]> {
  const key = `${lg}/${season}`;
  let p = seasonCache.get(key);
  if (!p) {
    p = (async () => {
      const out: Game[] = [];
      try {
        const rows = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "seasons", lg, `${season}.json`), "utf8")) as { id: string; date: string; away: string; home: string; as: number | null; hs: number | null; type?: string; ot?: boolean }[];
        for (const g of rows) {
          if (g.as == null || g.hs == null || !g.home || !g.away) continue;
          out.push({ id: g.id, date: String(g.date ?? "").slice(0, 10), away: g.away, home: g.home, as: g.as, hs: g.hs, type: g.type ?? "REG", ot: !!g.ot, season });
          addTeam(lg, g.home); addTeam(lg, g.away); // picks up any team name newer than the dictionary
        }
      } catch { /* skip an unreadable season file */ }
      return out;
    })();
    seasonCache.set(key, p);
  }
  return p;
}
// A typed year means: NFL/MLB season of that year; NBA/NHL/soccer season ENDING that year ("1996 Bulls" = 1995-96).
const seasonIsYear = (season: string, y: number) => (season.includes("-") ? Number(season.slice(0, 4)) + 1 === y : season === String(y));
// All of a league, or just the seasons that can hold a game from the given year.
async function loadLeague(lg: string, year: number | null = null, seasonStart: string | null = null): Promise<Game[]> {
  let seasons = await seasonsOf(lg);
  if (seasonStart) seasons = seasons.filter((s) => s.startsWith(seasonStart));
  else if (year != null) seasons = seasons.filter((s) => { const y0 = Number(s.slice(0, 4)); return y0 === year || y0 === year - 1; });
  return (await Promise.all(seasons.map((s) => loadSeason(lg, s)))).flat();
}

const hit = (lg: string, g: Game): GameHit => ({
  id: g.id, title: `${g.away} at ${g.home}`, league: LG[lg], date: g.date,
  score: `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}`, round: g.type === "REG" ? "" : ROUND[g.type] ?? "Playoffs",
});

// The last playoff series of each season (NBA Finals, Stanley Cup Final).
function finalsOf(games: Game[]): Game[] {
  const bySeason = new Map<string, Game[]>();
  for (const g of games) if (g.type !== "REG") { const l = bySeason.get(g.season); if (l) l.push(g); else bySeason.set(g.season, [g]); }
  const out: Game[] = [];
  for (const list of bySeason.values()) {
    const last = list.reduce((a, b) => (b.date > a.date ? b : a));
    const pair = new Set([last.home, last.away]);
    out.push(...list.filter((g) => pair.has(g.home) && pair.has(g.away)));
  }
  return out;
}

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 8));
  const none = NextResponse.json({ games: [] as GameHit[], total: 0 });
  try {
    let text = ` ${norm(raw.replace(/\b((?:18|19|20)\d{2})\s*[-–\/]\s*(\d{2}|\d{4})\b/g, " $1 "))} `; // "1995-96" -> the season starting 1995
    const seasonStart = raw.match(/\b((?:18|19|20)\d{2})\s*[-–\/]\s*(?:\d{2}|\d{4})\b/)?.[1] ?? null;

    // named finals, playoff words, league words
    let final: "sb" | "ws" | "nba" | "nhl" | null = null;
    const take = (re: RegExp) => { if (re.test(text)) { text = text.replace(re, " "); return true; } return false; };
    if (take(/\bsuper ?bowl\b/g)) final = "sb";
    else if (take(/\bworld series\b/g)) final = "ws";
    else if (take(/\bstanley cup( finals?)?\b/g)) final = "nhl";
    else if (take(/\bnba finals?\b/g)) final = "nba";
    let leagueWord: string | null = null;
    for (const [word, lg] of [["nfl", "nfl"], ["nba", "nba"], ["nhl", "nhl"], ["mlb", "mlb"], ["premier league", "epl"], ["la liga", "laliga"], ["serie a", "seriea"], ["bundesliga", "bundesliga"], ["ligue 1", "ligue1"]] as const) {
      if (take(new RegExp(`\\b${word}\\b`, "g"))) leagueWord = lg;
    }
    const postseason = take(/\b(playoffs?|postseason|finals?|championship)\b/g);
    for (const [re, to] of NICK) text = text.replace(re, to);

    const tokens = text.trim().split(" ").filter((t) => t && !FILLER.has(t));
    const years = tokens.filter((t) => /^(18|19|20)\d{2}$/.test(t)).map(Number);
    const year = seasonStart ? null : years[0] ?? null;
    const words = tokens.filter((t) => !/^(18|19|20)\d{2}$/.test(t));

    // team mentions: longest run of words that names a team; the last word may still be half-typed
    const mentions: TeamRef[][] = [];
    for (let i = 0; i < words.length; ) {
      let found: TeamRef[] | null = null, used = 0;
      for (let n = Math.min(4, words.length - i); n >= 1 && !found; n--) {
        const refs = ALIAS.get(words.slice(i, i + n).join(" "));
        if (refs) { found = refs; used = n; }
      }
      if (!found && i === words.length - 1 && words[i].length >= 3) {
        const partial: TeamRef[] = [];
        for (const [key, refs] of ALIAS) if (!key.includes(" ") && key.startsWith(words[i])) partial.push(...refs);
        if (partial.length > 0 && partial.length <= 12) { found = partial; used = 1; }
      }
      if (!found) return none; // a word that isn't a team, a year or a keyword: not a game search
      mentions.push(found); i += used;
    }
    const inLeague = (refs: TeamRef[]) => (leagueWord ? refs.filter((r) => r.lg === leagueWord) : refs);
    const A = mentions[0] ? inLeague(mentions[0]) : [], B = mentions[1] ? inLeague(mentions[1]) : [];
    const yearOk = (g: Game) => seasonStart ? g.season.startsWith(seasonStart) : year == null || g.date.startsWith(String(year)) || seasonIsYear(g.season, year);
    const load = (lg: string) => loadLeague(lg, year, seasonStart);

    let found: { lg: string; g: Game }[] = [];
    if (mentions.length >= 2) {
      for (const lg of new Set(A.map((r) => r.lg))) {
        const a = new Set(A.filter((r) => r.lg === lg).map((r) => r.name)), b = new Set(B.filter((r) => r.lg === lg).map((r) => r.name));
        if (b.size === 0) continue;
        for (const g of await load(lg)) if ((a.has(g.home) && b.has(g.away)) || (b.has(g.home) && a.has(g.away))) found.push({ lg, g });
      }
    } else if (mentions.length === 1 && (year != null || seasonStart || postseason || final)) {
      for (const lg of new Set(A.map((r) => r.lg))) {
        const a = new Set(A.filter((r) => r.lg === lg).map((r) => r.name));
        for (const g of await load(lg)) if (a.has(g.home) || a.has(g.away)) found.push({ lg, g });
      }
    } else if (mentions.length === 0 && final) {
      const lg = final === "sb" ? "nfl" : final === "ws" ? "mlb" : final;
      found = (await load(lg)).map((g) => ({ lg, g }));
    } else if (mentions.length === 1 && A.length > 0) {
      return NextResponse.json({ games: [], total: 0, hint: "team" }); // one team and nothing else: the page suggests adding a second team or a year
    } else return none;

    if (final === "sb") found = found.filter((x) => x.lg === "nfl" && x.g.type === "SB");
    else if (final === "ws") found = found.filter((x) => x.lg === "mlb" && x.g.type === "WS");
    else if (final) {
      const ids = new Set(finalsOf(await load(final)).map((g) => g.id));
      found = found.filter((x) => x.lg === final && ids.has(x.g.id));
    } else if (postseason) found = found.filter((x) => x.g.type !== "REG");
    found = found.filter((x) => yearOk(x.g));
    const po = (g: Game) => (g.type === "REG" ? 0 : 1);
    // newest first; when a year was typed, that year's playoff games lead
    found.sort((x, y) => (year != null ? po(y.g) - po(x.g) : 0) || y.g.date.localeCompare(x.g.date));

    return NextResponse.json({ games: found.slice(0, limit).map((x) => hit(x.lg, x.g)), total: found.length });
  } catch {
    return none;
  }
}