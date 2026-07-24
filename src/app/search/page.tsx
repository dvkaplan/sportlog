"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cleanTeamLabel } from "@/lib/labels";

type Team = {
  idTeam: string;
  strTeam: string;
  strLeague: string | null;
  strSport: string | null;
  strBadge: string | null;
};
type Player = {
  idPlayer: string;
  strPlayer: string;
  strTeam: string;
  strLeague: string | null;
  strPosition: string | null;
  strThumb: string | null;
};
type Fighter = {
  slug: string;
  name: string;
  sport: string;
  division: string;
  era: string;
  champion?: boolean;
  photo?: string | null;
};
type EventHit = { slug: string; name: string; date: string; count: number };
type FightHit = { id: string; title: string; date: string; score: string; event: string; sportSlug: string };


export default function SearchPage() {
  const [q, setQ] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [events, setEvents] = useState<EventHit[]>([]);
  const [fights, setFights] = useState<FightHit[]>([]);
  const [busy, setBusy] = useState(false);
 const [tab, setTab] = useState<"all" | "teams" | "players" | "fighters" | "events" | "fights">("all");
 

  useEffect(() => {
    if (q.trim().length < 2) {
      setTeams([]);
      setPlayers([]);
      setFighters([]);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const data = await fetch(`/api/sportsdb?mode=findteams&q=${encodeURIComponent(q)}`).then((r) => r.json());
        setTeams(data?.teams ?? []);
        setPlayers(data?.players ?? []);
        setFighters(data?.fighters ?? []);
        setEvents(data?.events ?? []);
        setFights(data?.fights ?? []);
        const ids = (data?.players ?? []).map((p: Player) => p.idPlayer);
        if (ids.length > 0) {
          const { data: clicks } = await supabase
            .from("entity_clicks")
            .select("entity_id, clicks")
            .eq("entity_type", "player")
            .in("entity_id", ids);
          const map: Record<string, number> = {};
          (clicks ?? []).forEach((c) => (map[c.entity_id] = Number(c.clicks)));
          setPlayers((prev) =>
            [...prev].sort((a, b) => (map[b.idPlayer] ?? 0) - (map[a.idPlayer] ?? 0))
          );
        }
      } catch {
        setEvents([]);
      setFights([]);
        setTeams([]);
        setPlayers([]);
        setFighters([]);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const showTeams = tab === "all" || tab === "teams";
  const showPlayers = tab === "all" || tab === "players";
  const showFighters = tab === "all" || tab === "fighters";
  const showEvents = tab === "all" || tab === "events";
  const showFights = tab === "all" || tab === "fights";
  const nothing =
    !busy && q.trim().length >= 2 && teams.length === 0 && players.length === 0 && fighters.length === 0&& events.length === 0 && fights.length === 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Teams, players, and fighters across all major leagues.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Lebron James, Lakers, McGregor, UFC 229…"
          className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-emerald-400"
        />
        <div className="mt-4 flex gap-2 text-sm">
          {(["all", "teams", "players", "fighters", "events", "fights"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 capitalize transition ${
                tab === t
                  ? "bg-emerald-400 font-semibold text-zinc-950"
                  : "border border-zinc-700 text-zinc-400 hover:border-emerald-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {busy && <p className="mt-3 text-sm text-zinc-500">Searching…</p>}

        {showTeams && teams.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-500">Teams</h2>
            <div className="mt-2 space-y-2">
              {teams.map((t) => (
                <Link
                  key={t.idTeam}
                  href={`/team/${t.idTeam}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-emerald-400"
                >
                  {t.strBadge ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.strBadge} alt="" className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-zinc-800" />
                  )}
                  <div>
                    <div className="font-medium">{t.strTeam}</div>
                    <div className="text-xs text-zinc-500">
                      {[t.strSport, t.strLeague].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {showPlayers && players.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-500">Players</h2>
            <div className="mt-2 space-y-2">
              {players.map((p) => (
                <Link
                  key={p.idPlayer}
                  href={`/player/${p.idPlayer}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-emerald-400"
                >
                  {p.strThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.strThumb} alt="" className="h-10 w-10 rounded-lg object-cover object-top" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">👤</div>
                  )}
                  <div>
                    <div className="font-medium">{p.strPlayer}</div>
                    <div className="text-xs text-zinc-500">
                      {[cleanTeamLabel(p.strTeam), p.strPosition, cleanTeamLabel(p.strLeague ?? "")]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {showFighters && fighters.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-500">Fighters</h2>
            <div className="mt-2 space-y-2">
              {fighters.map((f) => (
                <Link
                  key={f.slug}
                  href={`/fighter/${f.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-emerald-400"
                >
                  {f.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.photo} alt="" className="h-10 w-10 rounded-lg object-cover object-top" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                      {f.sport === "boxing" ? "🥊" : "🥋"}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">
                      {f.name}
                      {f.champion ? " 🏆" : ""}
                    </div>
                    <div className="text-xs text-zinc-500">{f.division} · {f.era}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
        {showEvents && events.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-500">Events</h2>
            <div className="mt-2 space-y-2">
              {events.map((e) => (
                <Link key={e.slug} href={`/event/${e.slug}`} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-emerald-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-amber-300">🎟️</div>
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-zinc-500">{[e.date, `${e.count} fight${e.count === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {showFights && fights.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-500">Fights</h2>
            <div className="mt-2 space-y-2">
              {fights.map((f) => (
                <Link key={f.id} href={`/game/${f.id}`} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-emerald-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">{f.sportSlug === "boxing" ? "🥊" : "🥋"}</div>
                  <div>
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-zinc-500">{[f.event, f.date, f.score].filter(Boolean).join(" · ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {nothing && <p className="mt-6 text-sm text-zinc-500">No results found.</p>}
      </div>
    </main>
  );
}