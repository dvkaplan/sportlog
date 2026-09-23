import { readFile, readdir } from "fs/promises";
import path from "path";
import { supabaseAdmin } from "./supabase-server";
import fightGamesData from "./fight-games.json";
import eventsData from "./events.json";

export type PopularGame = { id: string; title: string; league: string; date: string; score: string; ratings: number; reviews: number; avg: number; href?: string;};
type SG = { id: string; away: string; home: string; date: string; as: number | null; hs: number | null; ot?: boolean; type?: string };
const LG: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };

async function recentGames(days: number, only?: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const out: { id: string; title: string; league: string; date: string; score: string; notable: number }[] = [];
    for (const lg of only ?? Object.keys(LG)) {
    let files: string[] = [];
    try { files = (await readdir(path.join(process.cwd(), "src", "lib", "seasons", lg))).filter((f) => /^\d{4}/.test(f)).sort().slice(-2); } catch { continue; }
    for (const f of files) {
      try {
        const games = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "seasons", lg, f), "utf8")) as SG[];
        for (const g of games) {
          if (!g.date || g.date < since || g.date > today || g.as == null || g.hs == null) continue;
          const margin = Math.abs(g.as - g.hs);
          const notable = (g.type && g.type !== "REG" ? 3 : 0) + (g.ot ? 2 : 0) + (margin <= 3 ? 2 : margin <= 7 ? 1 : 0);
          out.push({ id: g.id, title: `${g.away} at ${g.home}`, league: LG[lg], date: g.date, score: `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}`, notable });
        }
      } catch { /* skip */ }
    }
  }
    const iso = (d: string) => { const t = Date.parse(d ?? ""); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };
      if (only) return out;
    const marquee = new Map<string, number>(); // gameId → 4 (main event) or 3 (co-main)
  for (const ev of eventsData as { fights: { gameId: string }[] }[]) {
    if (ev.fights?.[0]) marquee.set(ev.fights[0].gameId, 4);
    if (ev.fights?.[1]) marquee.set(ev.fights[1].gameId, 3);
  }
  for (const f of fightGamesData as { id: string; title: string; league?: string; date: string; score: string }[]) {
    const m = marquee.get(f.id);
        const fd = iso(f.date);
    if (m && fd && fd >= since && fd <= today) out.push({ id: f.id, title: f.title, league: f.league ?? "UFC", date: fd, score: f.score, notable: m });
  }
  return out;
}

export async function getPopularGames(limit = 10, days = 30, only?: string[]): Promise<PopularGame[]> {
  const recent = await recentGames(days, only);
  const agg: Record<string, { n: number; sum: number; reviews: number }> = {};
  try {
    const since = new Date(Date.now() - (days + 7) * 86400000).toISOString();
    const { data } = await supabaseAdmin.from("ratings").select("game_id, rating, review").gte("updated_at", since).limit(5000);
    for (const r of data ?? []) {
      const a = (agg[r.game_id] ??= { n: 0, sum: 0, reviews: 0 });
      a.n++; a.sum += Number(r.rating); if (r.review && String(r.review).trim()) a.reviews++;
    }
  } catch { /* ratings unavailable — fall back to notability */ }
  return recent
    .map((g) => { const a = agg[g.id]; return { ...g, ratings: a?.n ?? 0, reviews: a?.reviews ?? 0, avg: a ? a.sum / a.n : 0 }; })
    .sort((a, b) => (b.ratings * 10 + b.reviews * 5 + b.notable) - (a.ratings * 10 + a.reviews * 5 + a.notable) || b.date.localeCompare(a.date))
    .slice(0, limit);
}

import playersData from "./players.json";
import coachUniverseData from "./coach-universe.json";
import coachMediaData from "./coach-media.json";
import nbaMissing from "./nba-missing-players.json";
import nflMissing from "./nfl-missing-players.json";
import mlbMissing from "./mlb-missing-players.json";
import nhlMissing from "./nhl-missing-players.json";
import soccerUniv from "./soccer-player-ids.json";
import { ALL_FIGHTERS } from "./all-fighters";
import teamsData from "./teams.json";

export type Kind = "games" | "players" | "coaches" | "fighters" | "teams";
const KIND_TYPE: Record<Exclude<Kind, "games">, string> = { players: "player", coaches: "coach", fighters: "fighter", teams: "team" };

function resolveEntity(kind: Exclude<Kind, "games">, id: string): { title: string; league: string; href: string } | null {
  if (kind === "players") {
    const p = (playersData as { idPlayer: string; strPlayer: string; strLeague: string | null; strTeam: string | null }[]).find((x) => x.idPlayer === id);
    if (p) return { title: p.strPlayer, league: [p.strLeague, /^_Retired/i.test(p.strTeam ?? "") ? "Retired" : p.strTeam?.replace(/^_/, "")].filter(Boolean).join(" · "), href: `/player/${id}` };
    const gen: Record<string, { key: string; list: { name: string }[]; league: string }> = {
      nba: { key: "nbaId", list: nbaMissing as { name: string }[], league: "NBA" }, nfl: { key: "nflId", list: nflMissing as { name: string }[], league: "NFL" },
      mlb: { key: "mlbId", list: mlbMissing as { name: string }[], league: "MLB" }, nhl: { key: "nhlId", list: nhlMissing as { name: string }[], league: "NHL" },
    };
    const m = id.match(/^(nba|nfl|mlb|nhl)-(.+)$/);
    if (m && gen[m[1]]) {
      const hit = (gen[m[1]].list as Record<string, string>[]).find((x) => x[gen[m[1]].key] === m[2]);
      if (hit) return { title: hit.name, league: gen[m[1]].league, href: `/player/${id}` };
    }
    if (id.startsWith("soc-")) {
      const nm = (soccerUniv as { names: Record<string, string> }).names[id.slice(4)];
      if (nm) return { title: nm, league: "Soccer", href: `/player/${id}` };
    }
    return null;
  }
  if (kind === "coaches") {
    const cu = (coachUniverseData as Record<string, { name: string; leagues: string[] }>)[id];
    if (cu) return { title: cu.name, league: cu.leagues.join(" / "), href: `/coach/${id}` };
    const cm = (coachMediaData as Record<string, { name: string }>)[id];
    if (cm) return { title: cm.name, league: "Head coach", href: `/coach/${id}` };
    return null;
  }
    if (kind === "teams") {
    const t = (teamsData as { idTeam: string; strTeam: string; strLeague: string | null }[]).find((x) => x.idTeam === id);
    return t ? { title: t.strTeam, league: t.strLeague ?? "", href: `/team/${id}` } : null;
  }
  const f = ALL_FIGHTERS.find((x) => x.slug === id);
  return f ? { title: f.name, league: `${f.sport === "mma" ? "UFC" : "Boxing"} · ${f.division}`, href: `/fighter/${id}` } : null;
}

import coachRecordsData from "./coach-records.json";
import roleOverrides from "./role-overrides.json";

const slugOf = (n: string) => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function roleOf(slug: string): "player" | "coach" {
  const ov = (roleOverrides as Record<string, "player" | "coach">)[slug];
  if (ov) return ov;
  if (slug in (coachMediaData as object)) return "coach";
  if (!(slug in (coachUniverseData as object))) return "player";
  const rows = (coachRecordsData as Record<string, { rows: unknown[] }>)[slug]?.rows?.length ?? 0;
  return rows >= 8 ? "coach" : "player";
}

export async function getPopularEntities(kind: Exclude<Kind, "games">, limit = 10, days = 30, league?: string): Promise<PopularGame[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const people = kind === "players" || kind === "coaches";
  const types = people ? ["player", "coach"] : [KIND_TYPE[kind]];
  type Agg = { n: number; sum: number; reviews: number; follows: number };
  const raw: Record<string, Agg> = {}; // key: type|id
  for (const t of types) {
    try {
      const { data } = await supabaseAdmin.from("entity_ratings").select("entity_id, rating, review").eq("entity_type", t).gte("updated_at", since).limit(5000);
      for (const r of data ?? []) { const a = (raw[`${t}|${r.entity_id}`] ??= { n: 0, sum: 0, reviews: 0, follows: 0 }); a.n++; a.sum += Number(r.rating); if (r.review && String(r.review).trim()) a.reviews++; }
    } catch { /* table unavailable */ }
    try {
      const { data } = await supabaseAdmin.from("follows").select("entity_id").eq("entity_type", t).gte("created_at", since).limit(5000);
      for (const r of data ?? []) (raw[`${t}|${r.entity_id}`] ??= { n: 0, sum: 0, reviews: 0, follows: 0 }).follows++;
    } catch { /* optional */ }
  }
  type Person = Agg & { title: string; league: string; hrefPlayer?: string; hrefCoach?: string; role: "player" | "coach" };
  const merged: Record<string, Person> = {};
  for (const [key, a] of Object.entries(raw)) {
    const [t, id] = key.split("|");
    const rk = (t === "player" ? "players" : t === "coach" ? "coaches" : kind) as Exclude<Kind, "games">;
    const e = resolveEntity(rk, id);
    if (!e) continue;
    if (league && !e.league.toUpperCase().includes(league.toUpperCase())) continue;
    const pk = people ? slugOf(e.title) : key;
    const p = (merged[pk] ??= { n: 0, sum: 0, reviews: 0, follows: 0, title: e.title, league: e.league, role: people ? roleOf(slugOf(e.title)) : "player" });
    p.n += a.n; p.sum += a.sum; p.reviews += a.reviews; p.follows += a.follows;
    if (t === "player") p.hrefPlayer = e.href; else if (t === "coach") p.hrefCoach = e.href; else p.hrefPlayer = e.href;
    if (t === "coach" && !p.league) p.league = e.league;
  }
  const want = kind === "coaches" ? "coach" : "player";
  return Object.entries(merged)
    .filter(([, p]) => !people || p.role === want)
    .sort((a, b) => (b[1].n * 10 + b[1].reviews * 5 + b[1].follows * 3) - (a[1].n * 10 + a[1].reviews * 5 + a[1].follows * 3))
    .slice(0, limit)
    .map(([id, p]) => ({ id, title: p.title, league: p.league, date: "", score: "", ratings: p.n, reviews: p.reviews, avg: p.n ? p.sum / p.n : 0, href: p.role === "coach" ? (p.hrefCoach ?? `/coach/${slugOf(p.title)}`) : (p.hrefPlayer ?? p.hrefCoach ?? "#") }));
}

export async function getUpcomingGames(lg: string, days = 7): Promise<PopularGame[]> {
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const out: PopularGame[] = [];
  try {
    const files = (await readdir(path.join(process.cwd(), "src", "lib", "seasons", lg))).filter((f) => /^\d{4}/.test(f)).sort().slice(-2);
    for (const f of files) {
      const games = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "seasons", lg, f), "utf8")) as SG[];
      for (const g of games) {
        if (!g.date || g.date <= today || g.date > until || g.as != null) continue;
        out.push({ id: g.id, title: `${g.away} at ${g.home}`, league: LG[lg], date: g.date, score: "", ratings: 0, reviews: 0, avg: 0 });
      }
    }
  } catch { /* no schedule */ }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
}

// ---------- MMA: events, fights ----------
type EventRec = { slug: string; name: string; date: string; fights: { gameId: string }[] };
const isoDate = (d: string) => { const t = Date.parse(d ?? ""); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };
const PROMO_LABEL: Record<string, string> = { UFC: "UFC", BELLATOR: "Bellator", PRIDE: "PRIDE", STRIKEFORCE: "Strikeforce", WEC: "WEC", ONE: "ONE", PFL: "PFL", INVICTA: "Invicta", "CAGE WARRIORS": "Cage Warriors", KSW: "KSW", RIZIN: "RIZIN", AFFLICTION: "Affliction", ELITEXC: "EliteXC", DREAM: "DREAM" };
export const promotionOf = (name: string) => { const k = (name.match(/^(UFC|Bellator|PRIDE|Strikeforce|WEC|ONE|PFL|Invicta|Cage Warriors|KSW|RIZIN|Affliction|EliteXC|DREAM)/i)?.[1] ?? "").toUpperCase(); return PROMO_LABEL[k] ?? "Other"; };

export async function getRecentEvents(days = 60, limit = 10): Promise<PopularGame[]> {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const all = (eventsData as EventRec[]).map((e) => ({ ...e, iso: isoDate(e.date) })).filter((e) => e.iso);
  let recent = all.filter((e) => e.iso >= since && e.iso <= today);
  if (recent.length < 3) recent = all.filter((e) => e.iso <= today).sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, limit);
  const agg: Record<string, { n: number; sum: number; reviews: number }> = {};
  try {
    const ids = recent.flatMap((e) => e.fights.map((f) => f.gameId));
    if (ids.length) {
      const { data } = await supabaseAdmin.from("ratings").select("game_id, rating, review").in("game_id", ids.slice(0, 1000));
      for (const r of data ?? []) { const a = (agg[r.game_id] ??= { n: 0, sum: 0, reviews: 0 }); a.n++; a.sum += Number(r.rating); if (r.review && String(r.review).trim()) a.reviews++; }
    }
  } catch { /* ratings unavailable */ }
  return recent
    .map((e) => {
      const rs = e.fights.map((f) => agg[f.gameId]).filter(Boolean);
      const n = rs.reduce((s, a) => s + a.n, 0), sum = rs.reduce((s, a) => s + a.sum, 0), reviews = rs.reduce((s, a) => s + a.reviews, 0);
      return { id: e.slug, title: e.name, league: promotionOf(e.name), date: e.iso, score: `${e.fights.length} fights`, ratings: n, reviews, avg: n ? sum / n : 0, href: `/event/${e.slug}`, _k: n * 10 + reviews * 5 + Math.min(e.fights.length, 14) };
    })
    .sort((a, b) => b._k - a._k || b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(({ _k, ...g }) => g);
}

export async function getPopularFights(limit = 8, days = 365): Promise<PopularGame[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const agg: Record<string, { n: number; sum: number; reviews: number }> = {};
  try {
    const { data } = await supabaseAdmin.from("ratings").select("game_id, rating, review").like("game_id", "fight-%").gte("updated_at", since).limit(5000);
    for (const r of data ?? []) { const a = (agg[r.game_id] ??= { n: 0, sum: 0, reviews: 0 }); a.n++; a.sum += Number(r.rating); if (r.review && String(r.review).trim()) a.reviews++; }
  } catch { /* unavailable */ }
  const FG = fightGamesData as { id: string; title: string; league?: string; date: string; score: string; blurb?: string }[];
  return Object.entries(agg)
    .sort((a, b) => (b[1].n * 10 + b[1].reviews * 5) - (a[1].n * 10 + a[1].reviews * 5))
    .slice(0, limit * 2)
    .flatMap(([id, a]) => { const f = FG.find((x) => x.id === id); return f ? [{ id, title: f.title, league: f.blurb || f.league || "MMA", date: isoDate(f.date), score: f.score, ratings: a.n, reviews: a.reviews, avg: a.sum / a.n, href: `/game/${id}` }] : []; })
    .slice(0, limit);
}