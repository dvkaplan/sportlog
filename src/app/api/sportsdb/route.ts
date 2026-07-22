import { NextRequest, NextResponse } from "next/server";
import teamsData from "@/lib/teams.json";
import playersData from "@/lib/players.json";

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
        if (name === q) return 3;
        if (name.startsWith(q)) return 2;
        if (name.split(/\s+/).some((w) => w.startsWith(q))) return 1;
        return 0;
      };
      const playerMatches = PLAYERS.filter((p) => p.strPlayer.toLowerCase().includes(q))
        .sort((a, b) => prank(b) - prank(a))
        .slice(0, 25);
      return NextResponse.json({ teams: matches, players: playerMatches });
      
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