import { NextRequest, NextResponse } from "next/server";
import teamsData from "@/lib/teams.json";
import playersData from "@/lib/players.json";
import { ALL_FIGHTERS } from "@/lib/all-fighters";
import { ALIASES } from "@/lib/fighter-extras";
import fighterMedia from "@/lib/fighter-media.json";
import eventsData from "@/lib/events.json";
import fightGamesData from "@/lib/fight-games.json";

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
      const playerMatches = PLAYERS.filter((p) => p.strPlayer.toLowerCase().includes(q))
        .sort((a, b) => prank(b) - prank(a))
        .slice(0, 25);
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
      return NextResponse.json({ teams: matches, players: playerMatches, fighters: fighterMatches, events: eventMatches, fights: fightMatches });
      
    }

    let url = "";
    if (mode === "team") url = `${BASE}/lookupteam.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
    else if (mode === "last") url = `${BASE}/eventslast.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
    else if (mode === "next") url = `${BASE}/eventsnext.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
    else if (mode === "players") url = `${BASE}/lookup_all_players.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
    else if (mode === "player") url = `${BASE}/lookupplayer.php?id=${encodeURIComponent(p.get("id") ?? "")}`;
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