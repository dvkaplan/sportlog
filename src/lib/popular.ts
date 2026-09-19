import { readFile, readdir } from "fs/promises";
import path from "path";
import { supabaseAdmin } from "./supabase-server";
import fightGamesData from "./fight-games.json";
import eventsData from "./events.json";

export type PopularGame = { id: string; title: string; league: string; date: string; score: string; ratings: number; reviews: number; avg: number; href?: string;};
type SG = { id: string; away: string; home: string; date: string; as: number | null; hs: number | null; ot?: boolean; type?: string };
const LG: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };

async function recentGames(days: number) {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const out: { id: string; title: string; league: string; date: string; score: string; notable: number }[] = [];
  for (const lg of Object.keys(LG)) {
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

export async function getPopularGames(limit = 10, days = 30): Promise<PopularGame[]> {
  const recent = await recentGames(days);
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
    if (p) return { title: p.strPlayer, league: [p.strLeague, p.strTeam?.replace(/^_/, "")].filter(Boolean).join(" · "), href: `/player/${id}` };
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

export async function getPopularEntities(kind: Exclude<Kind, "games">, limit = 10, days = 30): Promise<PopularGame[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const agg: Record<string, { n: number; sum: number; reviews: number; follows: number }> = {};
  try {
    const { data } = await supabaseAdmin.from("entity_ratings").select("entity_id, rating, review").eq("entity_type", KIND_TYPE[kind]).gte("updated_at", since).limit(5000);
    for (const r of data ?? []) {
      const a = (agg[r.entity_id] ??= { n: 0, sum: 0, reviews: 0, follows: 0 });
      a.n++; a.sum += Number(r.rating); if (r.review && String(r.review).trim()) a.reviews++;
    }
  } catch { /* table unavailable */ }
  try {
    const { data } = await supabaseAdmin.from("follows").select("entity_id").eq("entity_type", KIND_TYPE[kind]).gte("created_at", since).limit(5000);
    for (const r of data ?? []) (agg[r.entity_id] ??= { n: 0, sum: 0, reviews: 0, follows: 0 }).follows++;
  } catch { /* follows table may differ — ratings alone still work */ }
  return Object.entries(agg)
    .sort((a, b) => (b[1].n * 10 + b[1].reviews * 5 + b[1].follows * 3) - (a[1].n * 10 + a[1].reviews * 5 + a[1].follows * 3))
    .slice(0, limit * 2)
    .flatMap(([id, a]) => { const e = resolveEntity(kind, id); return e ? [{ id, title: e.title, league: e.league, date: "", score: "", ratings: a.n, reviews: a.reviews, avg: a.n ? a.sum / a.n : 0, href: e.href }] : []; })
    .slice(0, limit);
}