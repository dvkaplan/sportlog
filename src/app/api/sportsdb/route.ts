import { NextRequest, NextResponse } from "next/server";
import teamsData from "@/lib/teams.json";
import playersData from "@/lib/players.json";
import { ALL_FIGHTERS } from "@/lib/all-fighters";
import { ALIASES } from "@/lib/fighter-extras";
import fighterMedia from "@/lib/fighter-media.json";
import eventsData from "@/lib/events.json";
import fightGamesData from "@/lib/fight-games.json";
import coachMediaJson from "@/lib/coach-media.json";
import { readFile } from "fs/promises";
import path from "path";
import fightStatsData from "@/lib/fight-stats.json";
import fightRedirectsData from "@/lib/fight-redirects.json";
import { GAMES } from "@/lib/data";
import { eventSlugForName } from "@/lib/events";
import { OPPONENT_ALIASES } from "@/lib/fighter-extras";
import nflSeasons from "@/lib/seasons/nfl/index.json";
import nbaSeasons from "@/lib/seasons/nba/index.json";
import nhlSeasons from "@/lib/seasons/nhl/index.json";
import mlbSeasons from "@/lib/seasons/mlb/index.json";
import eplSeasons from "@/lib/seasons/epl/index.json";
import laligaSeasons from "@/lib/seasons/laliga/index.json";
import serieaSeasons from "@/lib/seasons/seriea/index.json";
import bundesligaSeasons from "@/lib/seasons/bundesliga/index.json";
import ligue1Seasons from "@/lib/seasons/ligue1/index.json";
import nbaMissingData from "@/lib/nba-missing-players.json";
import nflMissingData from "@/lib/nfl-missing-players.json";

const BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_KEY ?? "3"}`;

type SlimTeam = {
  idTeam: string;
  strTeam: string;
  strLeague: string | null;
  strSport: string | null;
  strBadge: string | null;
  strAlternate: string | null;
};

const TEAMS = teamsData as SlimTeam[];
type SlimPlayer = {
  idPlayer: string;
  strPlayer: string;
  idTeam: string;
  strTeam: string;
  strLeague: string | null;
  strSport: string | null;
  strPosition: string | null;
  strThumb: string | null;
};

const PLAYERS = playersData as SlimPlayer[];
type SlimEvent = { slug: string; name: string; date: string; fights: { gameId: string }[] };
type SlimFight = { id: string; title: string; date: string; score: string; blurb: string; sportSlug: string };
const EVENTS_IDX = (eventsData as SlimEvent[]).map((e) => ({
  slug: e.slug, name: e.name, date: e.date, count: e.fights.length,
}));
const FIGHTS_IDX = (fightGamesData as SlimFight[]).map((f) => ({
  id: f.id, title: f.title, date: f.date, score: f.score, event: f.blurb, sportSlug: f.sportSlug,
}));
const SEASONS_IDX = (
  [
    ["nfl", "NFL", nflSeasons], ["nba", "NBA", nbaSeasons], ["nhl", "NHL", nhlSeasons], ["mlb", "MLB", mlbSeasons],
    ["epl", "Premier League", eplSeasons], ["laliga", "La Liga", laligaSeasons], ["seriea", "Serie A", serieaSeasons],
    ["bundesliga", "Bundesliga", bundesligaSeasons], ["ligue1", "Ligue 1", ligue1Seasons],
  ] as [string, string, string[]][]
).flatMap(([key, name, arr]) =>
  arr.map((s) => ({ league: key, leagueName: name, season: s, label: `${name} ${s} season` }))
);
type GenP = { nbaId?: string | null; nflId?: string | null; name: string; first: string; last: string; teams?: string[] };
const normG = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const GEN_NBA = (nbaMissingData as GenP[]).filter((m) => m.nbaId);
const GEN_NFL = (nflMissingData as GenP[]).filter((m) => m.nflId);
const GEN_NBA_BYNAME: Record<string, string> = Object.fromEntries(GEN_NBA.map((m) => [normG(m.name), `nba-${m.nbaId}`]));
const GEN_NFL_BYNAME: Record<string, string> = Object.fromEntries(GEN_NFL.map((m) => [normG(m.name), `nfl-${m.nflId}`]));


export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("mode");

  try {
    if (mode === "findteams") {
      const q = (p.get("q") ?? "").trim().toLowerCase();
      if (q.length < 2) return NextResponse.json({ teams: [] });
      const all = TEAMS;
      const rank = (t: SlimTeam) => {
        const name = t.strTeam.toLowerCase();
        if (name === q) return 3;
        if (name.startsWith(q)) return 2;
        if (name.split(/\s+/).some((w) => w.startsWith(q))) return 1;
        return 0;
      };
      const matches = all
        .filter(
          (t) =>
            t.strTeam.toLowerCase().includes(q) ||
            (t.strAlternate ?? "").toLowerCase().includes(q) ||
            (t.strLeague ?? "").toLowerCase().includes(q)
        )
        .sort((a, b) => rank(b) - rank(a))
        .slice(0, 25);
        const prank = (p: SlimPlayer) => {
        const name = p.strPlayer.toLowerCase();
        let score = 0;
        if (name === q) score = 30;
        else if (name.startsWith(q)) score = 20;
        else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 10;
        if ((p.strTeam ?? "").startsWith("_")) score += 5;
        return score;
      };
      const STAFF_WORDS = ["coach", "manager", "president", "chairman", "owner", "director", "general manager", "scout", "trainer", "executive", "associate", "coordinator"];
      const isStaffPos = (pos: string | null) => {
        const p = (pos ?? "").toLowerCase();
        return STAFF_WORDS.some((w) => p.includes(w));
      };
      const allNameHits = PLAYERS.filter((p) => p.strPlayer.toLowerCase().includes(q));
      const playerMatches = allNameHits.filter((p) => !isStaffPos(p.strPosition)).sort((a, b) => prank(b) - prank(a)).slice(0, 25);
      const genPlayers = [
        ...GEN_NBA.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 4)
          .map((m) => ({ idPlayer: `nba-${m.nbaId}`, strPlayer: m.name, strTeam: `_NBA ${m.first}–${m.last}`, strLeague: "NBA", strPosition: null as string | null, strThumb: null as string | null, strSport: "Basketball" })),
        ...GEN_NFL.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 4)
          .map((m) => ({ idPlayer: `nfl-${m.nflId}`, strPlayer: m.name, strTeam: `_NFL ${(m.teams ?? []).join(" ")}`.trim(), strLeague: "NFL", strPosition: null as string | null, strThumb: null as string | null, strSport: "American Football" })),
      ];
      const CM = coachMediaJson as Record<string, { name: string; photo: string | null }>;
      const wikiCoaches = Object.entries(CM)
        .filter(([, c]) => c.name.toLowerCase().includes(q))
        .map(([slug, c]) => ({ kind: "coach" as const, slug, idPlayer: null as string | null, name: c.name, role: "Head Coach", team: null as string | null, sport: null as string | null, photo: c.photo }));
      const seenCoach = new Set(wikiCoaches.map((c) => c.name.toLowerCase()));
      const tsdbStaff = allNameHits
        .filter((p) => isStaffPos(p.strPosition) && !seenCoach.has(p.strPlayer.toLowerCase()))
        .slice(0, 10)
        .map((p) => ({ kind: "tsdb" as const, slug: null as string | null, idPlayer: p.idPlayer, name: p.strPlayer, role: p.strPosition, team: p.strTeam, sport: p.strSport, photo: p.strThumb }));
      const coachMatches = [...wikiCoaches, ...tsdbStaff].slice(0, 12);
        const aliasHits = Object.entries(ALIASES)
        .filter(([alias]) => alias.includes(q) || q.includes(alias))
        .map(([, s]) => s);
      const FM = fighterMedia as Record<string, { photo: string | null }>;
      const fighterMatches = ALL_FIGHTERS.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.division.toLowerCase().includes(q) ||
          aliasHits.includes(f.slug)
      )
        .slice(0, 15)
        .map((f) => ({ ...f, photo: FM[f.slug]?.photo ?? null }));
        let eventMatches: typeof EVENTS_IDX = [];
      let fightMatches: typeof FIGHTS_IDX = [];
      if (q.length >= 3) {
        const words = q.split(/\s+/).filter(Boolean);
        eventMatches = EVENTS_IDX.filter((e) => {
          const n = e.name.toLowerCase();
          return words.every((w) => n.includes(w));
        })
          .sort((a, b) => (a.name.toLowerCase().startsWith(q) ? -1 : 0) - (b.name.toLowerCase().startsWith(q) ? -1 : 0) || (b.date || "").localeCompare(a.date || ""))
          .slice(0, 8);
        fightMatches = FIGHTS_IDX.filter((f) => {
          const t = f.title.toLowerCase();
          return words.every((w) => t.includes(w));
        })
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .slice(0, 10);
      }
      let seasonMatches: typeof SEASONS_IDX = [];
      if (q.length >= 3) {
        const words = q.split(/\s+/).filter(Boolean);
        seasonMatches = SEASONS_IDX.filter((s) => {
          const l = s.label.toLowerCase();
          return words.every((w) => l.includes(w));
        }).slice(0, 8);
      }
      return NextResponse.json({ teams: matches, players: [...playerMatches, ...genPlayers], fighters: fighterMatches, coaches: coachMatches, events: eventMatches, fights: fightMatches, seasons: seasonMatches });
      
    }
    if (mode === "game") {
      const id = p.get("id") ?? "";
     const hm = id.match(/^(nfl|nba|nhl|mlb|epl|laliga|seriea|bundesliga|ligue1)-(\d{4})/);
      if (hm) {
        const league = hm[1];
        const yr = Number(hm[2]);
        const cross = ["nba", "nhl", "epl", "laliga", "seriea", "bundesliga", "ligue1"];
        const candidates = cross.includes(league)
          ? [`${yr - 1}-${String(yr % 100).padStart(2, "0")}`, `${yr}-${String((yr + 1) % 100).padStart(2, "0")}`]
          : [String(yr)];
        const SPORT: Record<string, string> = { nfl: "football", nba: "basketball", nhl: "hockey", mlb: "baseball", epl: "soccer", laliga: "soccer", seriea: "soccer", bundesliga: "soccer", ligue1: "soccer" };
        const LG: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };
        const teamId = (name: string) => TEAMS.find((t) => t.strTeam.toLowerCase() === name.toLowerCase())?.idTeam ?? null;
        for (const season of candidates) {
          try {
            const file = path.join(process.cwd(), "src", "lib", "seasons", league, `${season}.json`);
            type HG = { id: string; away: string; home: string; date: string; as: number | null; hs: number | null; ot?: boolean; type?: string; espn?: string | null; st?: Record<string, [string, string]> | null };
            const all = JSON.parse(await readFile(file, "utf8")) as HG[];
            const hg = all.find((x) => x.id === id);
            if (!hg) continue;
            let legacyEspn: string | null = hg.espn ?? null;
            if (league === "nfl" && !legacyEspn) {
              try {
                const m = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "nfl-espn-map.json"), "utf8")) as { map: Record<string, string> };
                legacyEspn = m.map[id] ?? null;
              } catch { /* map not built yet */ }
            }
            const rec = (team: string) => {
              let w = 0, l = 0, t = 0;
              for (const g of all) {
                if (g.date >= hg.date || g.as == null || g.hs == null) continue;
                if (g.home !== team && g.away !== team) continue;
                const mine = g.home === team ? g.hs : g.as, theirs = g.home === team ? g.as : g.hs;
                if (mine > theirs) w++; else if (mine < theirs) l++; else t++;
              }
              return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
            };
            return NextResponse.json({
              game: {
                id: hg.id, sportSlug: SPORT[league], league: LG[league],
                title: `${hg.away} @ ${hg.home}`, date: hg.date,
                score: hg.as != null && hg.hs != null ? `${hg.as}–${hg.hs}${hg.ot ? " (OT)" : ""}` : "",
                blurb: hg.type === "SB" ? "Super Bowl" : hg.type === "WS" ? "World Series" : "",
              },
              hist: {
                leagueKey: league, season,
                away: { name: hg.away, id: teamId(hg.away), record: rec(hg.away) },
                home: { name: hg.home, id: teamId(hg.home), record: rec(hg.home) },
                espn: legacyEspn, soccerStats: hg.st ?? null,
              },
              stats: null, eventSlug: null, eventName: null, chips: [],
            });
          } catch { /* next candidate */ }
        }
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      const REDIR = fightRedirectsData as Record<string, string>;
      const finalId = REDIR[id] ?? id;
      const game =
        GAMES.find((x) => x.id === finalId) ??
        (fightGamesData as { id: string; title: string; blurb: string }[]).find((x) => x.id === finalId) ??
        null;
      if (!game) return NextResponse.json({ error: "not found" }, { status: 404 });
      const FS = fightStatsData as Record<string, unknown>;
      const stats = (FS[game.id] as object | undefined) ?? null;
      const evName = ((stats as { event?: string } | null)?.event ?? game.blurb ?? "") || null;
      const eventSlug = game.id.startsWith("fight-") && evName ? eventSlugForName(evName) : null;
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const chips = game.id.startsWith("fight-")
        ? game.title.split(" vs ").map((n: string) => {
            const key = norm(n);
            const slug = OPPONENT_ALIASES[key] ?? ALL_FIGHTERS.find((x) => norm(x.name) === key)?.slug ?? null;
            return { name: n.trim(), slug };
          })
        : [];
      return NextResponse.json({ game, stats, eventName: evName, eventSlug, chips });
    }
    if (mode === "boxscore") {
      const id = p.get("id") ?? "";
      const espn = p.get("espn") ?? "";
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const genMap = id.startsWith("nba-") ? GEN_NBA_BYNAME : (id.startsWith("nfl-") || espn) ? GEN_NFL_BYNAME : null;
      const pid = (name: string) => {
        const n = norm(name);
        const bare = n.replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
        return PLAYERS.find((x) => norm(x.strPlayer) === n)?.idPlayer
          ?? PLAYERS.find((x) => norm(x.strPlayer) === bare)?.idPlayer
          ?? genMap?.[n] ?? genMap?.[bare] ?? null;
      };
      type Row = { name: string; playerId: string | null; cells: (string | number)[] };
      type Group = { title: string; columns: string[]; rows: Row[] };
      const out = { teamStats: [] as { label: string; away: string | number; home: string | number }[], groups: [] as Group[] };
      try {
        if (id.startsWith("nfl-")) {
          try {
            const lfile = path.join(process.cwd(), "src", "lib", "boxscores", "nfl-legacy.json");
            const lstore = JSON.parse(await readFile(lfile, "utf8")) as Record<string, { teamStats?: { label: string; away: string | number; home: string | number }[]; groups?: { title: string; columns: string[]; rows: { name: string; cells: (string | number)[] }[] }[] }>;
            const lhit = lstore[id];
            if (lhit) {
              out.teamStats = lhit.teamStats ?? [];
              out.groups = (lhit.groups ?? []).map((grp) => ({ ...grp, rows: grp.rows.map((r) => ({ ...r, playerId: pid(r.name) })) }));
              return NextResponse.json(out);
            }
          } catch { /* legacy store absent — modern NFL falls through to ESPN */ }
        }
        if (id.startsWith("mlb-")) {
          const pk = id.split("-")[2];
          const j = await fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/boxscore`, { next: { revalidate: 86400 } }).then((r) => r.json());
          for (const side of ["away", "home"] as const) {
            const t = j?.teams?.[side];
            const bat: Row[] = [], pit: Row[] = [];
            for (const key of t?.batters ?? []) {
              const pl = t?.players?.[`ID${key}`]; const s = pl?.stats?.batting;
              if (!s || s.atBats == null) continue;
              bat.push({ name: pl.person?.fullName ?? "", playerId: pid(pl.person?.fullName ?? ""), cells: [s.atBats, s.runs, s.hits, s.rbi, s.baseOnBalls, s.strikeOuts] });
            }
            for (const key of t?.pitchers ?? []) {
              const pl = t?.players?.[`ID${key}`]; const s = pl?.stats?.pitching;
              if (!s) continue;
              pit.push({ name: pl.person?.fullName ?? "", playerId: pid(pl.person?.fullName ?? ""), cells: [s.inningsPitched ?? "", s.hits ?? 0, s.runs ?? 0, s.earnedRuns ?? 0, s.baseOnBalls ?? 0, s.strikeOuts ?? 0] });
            }
            out.groups.push({ title: `${t?.team?.name ?? side} — Batting`, columns: ["AB", "R", "H", "RBI", "BB", "SO"], rows: bat });
            out.groups.push({ title: `${t?.team?.name ?? side} — Pitching`, columns: ["IP", "H", "R", "ER", "BB", "SO"], rows: pit });
          }
        } else if (id.startsWith("nhl-")) {
          const gid = id.split("-").slice(2).join("-");
          const j = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gid}/boxscore`, { next: { revalidate: 86400 } }).then((r) => r.json());
          for (const side of ["awayTeam", "homeTeam"] as const) {
            const label = j?.[side]?.commonName?.default ?? side;
            const st = j?.playerByGameStats?.[side];
            const sk: Row[] = [];
            for (const p2 of [...(st?.forwards ?? []), ...(st?.defense ?? [])]) {
              const nm = p2?.name?.default ?? "";
              sk.push({ name: nm, playerId: pid(nm), cells: [p2.goals ?? 0, p2.assists ?? 0, p2.points ?? 0, p2.sog ?? 0, p2.hits ?? 0, p2.toi ?? ""] });
            }
            const gl: Row[] = (st?.goalies ?? []).map((p2: { name?: { default?: string }; saveShotsAgainst?: string; savePctg?: string; toi?: string }) => ({ name: p2?.name?.default ?? "", playerId: pid(p2?.name?.default ?? ""), cells: [p2.saveShotsAgainst ?? "", p2.savePctg ?? "", p2.toi ?? ""] }));
            out.groups.push({ title: `${label} — Skaters`, columns: ["G", "A", "P", "SOG", "HIT", "TOI"], rows: sk });
            out.groups.push({ title: `${label} — Goalies`, columns: ["SV-SA", "SV%", "TOI"], rows: gl });
          }
        } else if (id.startsWith("nba-")) {
         // Pre-2002 era: pre-imported box scores from disk
          {
            const byr = Number(id.split("-")[1]);
            const cands = [`${byr - 1}-${String(byr % 100).padStart(2, "0")}`, `${byr}-${String((byr + 1) % 100).padStart(2, "0")}`];
            for (const ssn of cands) {
              try {
                const bfile = path.join(process.cwd(), "src", "lib", "boxscores", "nba", `${ssn}.json`);
                const store = JSON.parse(await readFile(bfile, "utf8")) as Record<string, { unavailable?: boolean; teamStats?: { label: string; away: string | number; home: string | number }[]; groups?: { title: string; columns: string[]; rows: { name: string; cells: (string | number)[] }[] }[] }>;
                const hit = store[id];
                if (!hit) continue;
                if (hit.unavailable) return NextResponse.json({ error: "unrecorded" }, { status: 404 });
                out.teamStats = hit.teamStats ?? [];
                out.groups = (hit.groups ?? []).map((grp) => ({ ...grp, rows: grp.rows.map((r) => ({ ...r, playerId: pid(r.name) })) }));
                return NextResponse.json(out);
              } catch { /* season file not imported yet — fall through to ESPN */ }
            }
          }
            let espnId: string | null = null;
          try {
            const mapFile = path.join(process.cwd(), "src", "lib", "nba-espn-map.json");
            const st = JSON.parse(await readFile(mapFile, "utf8")) as { map: Record<string, string> };
            espnId = st.map[id] ?? null;
          } catch { /* map not built yet */ }
          if (!espnId) return NextResponse.json({ error: "pre-espn" }, { status: 404 });
          const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`, { next: { revalidate: 86400 } }).then((r) => r.json());
          const [ta, tb] = j?.boxscore?.teams ?? [];
          for (const s of ta?.statistics ?? []) {
            const twin = (tb?.statistics ?? []).find((x: { label: string }) => x.label === s.label);
            if (!out.teamStats.some((x) => x.label === s.label)) {
              out.teamStats.push({ label: s.label, away: s.displayValue, home: twin?.displayValue ?? "" });
            }
          }
          for (const teamBlock of j?.boxscore?.players ?? []) {
            const tname = teamBlock?.team?.displayName ?? "";
            for (const cat of teamBlock?.statistics ?? []) {
              const rows: Row[] = (cat?.athletes ?? []).map((a: { athlete?: { displayName?: string }; stats?: string[] }) => {
                const nm = a?.athlete?.displayName ?? "";
                return { name: nm, playerId: pid(nm), cells: a?.stats ?? [] };
              }).filter((r: Row) => r.cells.length > 0);
              if (rows.length) out.groups.push({ title: tname, columns: cat?.labels ?? [], rows });
            }
          }
        } else if (espn) {
          const j = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${espn}`, { next: { revalidate: 86400 } }).then((r) => r.json());
          const [ta, tb] = j?.boxscore?.teams ?? [];
          for (const s of ta?.statistics ?? []) {
            const twin = (tb?.statistics ?? []).find((x: { label: string }) => x.label === s.label);
            if (!out.teamStats.some((x) => x.label === s.label)) {
              out.teamStats.push({ label: s.label, away: s.displayValue, home: twin?.displayValue ?? "" });
            }
          }
          for (const teamBlock of j?.boxscore?.players ?? []) {
            const tname = teamBlock?.team?.displayName ?? "";
            for (const cat of teamBlock?.statistics ?? []) {
              const rows: Row[] = (cat?.athletes ?? []).map((a: { athlete?: { displayName?: string }; stats?: string[] }) => {
                const nm = a?.athlete?.displayName ?? "";
                return { name: nm, playerId: pid(nm), cells: a?.stats ?? [] };
              });
              if (rows.length) out.groups.push({ title: `${tname} — ${cat?.text ?? cat?.name ?? ""}`, columns: cat?.labels ?? [], rows });
            }
          }
        }
        return NextResponse.json(out);
      } catch {
        return NextResponse.json({ error: "unavailable" }, { status: 502 });
      }
    }

    if (mode === "player") {
      const pidReq = p.get("id") ?? "";
      const res = await fetch(`${BASE}/lookupplayer.php?id=${encodeURIComponent(pidReq)}`, { next: { revalidate: 300 } });
      const data = await res.json().catch(() => ({}));
      const local = PLAYERS.find((x) => x.idPlayer === pidReq);
      if (data?.players?.[0] && local) {
        // Our roster sync (ESPN, daily) outranks TSDB's stale assignments
        data.players[0].strTeam = local.strTeam ?? data.players[0].strTeam;
        if (local.idTeam) data.players[0].idTeam = local.idTeam;
        if (!data.players[0].strThumb && local.strThumb) data.players[0].strThumb = local.strThumb;
      }
            let nbaId: string | null = null;
      const pName = data?.players?.[0]?.strPlayer;
      if (pName && (data?.players?.[0]?.strSport ?? "") === "Basketball") {
        try {
          const pidsFile = path.join(process.cwd(), "src", "lib", "nba-player-ids.json");
          const pids = JSON.parse(await readFile(pidsFile, "utf8")) as { names: Record<string, string> };
          const nrm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
          const target = nrm(pName);
          for (const [nid, nm] of Object.entries(pids.names)) {
            if (nrm(nm) === target) { nbaId = nid; break; }
          }
        } catch { /* ids file missing */ }
      }
                 let espnId: string | null = data?.players?.[0]?.idESPN ?? null;
      if (!espnId && (data?.players?.[0]?.strSport ?? "") === "American Football") {
        try {
          const emap = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "nfl-espn-ids.json"), "utf8")) as Record<string, string | null>;
                    espnId = emap[pidReq] ?? null;
          try {
            const om = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "nfl-espn-overrides.json"), "utf8")) as Record<string, string>;
            if (om[pidReq]) espnId = om[pidReq];
          } catch { /* no overrides yet */ }
        } catch { /* map not built yet */ }
      }
      return NextResponse.json({ ...data, nbaId, espnId });
    }

    if (mode === "players") {
      const teamIdReq = p.get("id") ?? "";
      const res = await fetch(`${BASE}/lookup_all_players.php?id=${encodeURIComponent(teamIdReq)}`, { next: { revalidate: 300 } });
      const data = await res.json().catch(() => ({}));
      const remote = (data?.player ?? []) as SlimPlayer[];
      const localById = new Map(PLAYERS.map((x) => [x.idPlayer, x]));
      // Drop players our fresher data says have LEFT this team…
      const stillHere = remote.filter((r) => {
        const loc = localById.get(r.idPlayer);
        return !loc || !loc.idTeam || loc.idTeam === teamIdReq;
      });
      // …and add players our data says have ARRIVED that TSDB doesn't list yet
      const seen = new Set(stillHere.map((x) => x.idPlayer));
      const arrivals = PLAYERS.filter((x) => x.idTeam === teamIdReq && !seen.has(x.idPlayer));
      return NextResponse.json({ player: [...stillHere, ...arrivals] });
    }
    let url = "";
    if (mode === "team") url = `${BASE}/lookupteam.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
    else if (mode === "last") url = `${BASE}/eventslast.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
    else if (mode === "next") url = `${BASE}/eventsnext.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
  
   
    else if (mode === "table")
      url = `${BASE}/lookuptable.php?l=${encodeURIComponent(p.get("league") ?? "")}&s=${encodeURIComponent(p.get("season") ?? "")}`;
    else return NextResponse.json({ error: "bad mode" }, { status: 400 });

    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}