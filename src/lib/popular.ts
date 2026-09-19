import { readFile, readdir } from "fs/promises";
import path from "path";
import { supabaseAdmin } from "./supabase-server";
import fightGamesData from "./fight-games.json";
import eventsData from "./events.json";

export type PopularGame = { id: string; title: string; league: string; date: string; score: string; ratings: number; reviews: number; avg: number };
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