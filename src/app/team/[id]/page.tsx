"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

type Team = {
  idTeam: string;
  idLeague: string | null;
  strTeam: string;
  strLeague: string | null;
  strStadium: string | null;
  intFormedYear: string | null;
  strDescriptionEN: string | null;
  strBadge?: string | null;
  strTeamBadge?: string | null;
};
type Event = {
  idEvent: string;
  strEvent: string;
  dateEvent: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
};
type Player = { idPlayer: string; strPlayer: string; strPosition: string | null; strCutout?: string | null; strThumb?: string | null };
type TableRow = { idTeam: string; intRank: string; intWin: string; intLoss: string; intDraw: string | null; intPoints: string | null };

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [team, setTeam] = useState<Team | null>(null);
  const [last, setLast] = useState<Event[]>([]);
  const [next, setNext] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [record, setRecord] = useState<TableRow | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, l, n, pl] = await Promise.all([
          fetch(`/api/sportsdb?mode=team&id=${id}`).then((r) => r.json()),
          fetch(`/api/sportsdb?mode=last&id=${id}`).then((r) => r.json()),
          fetch(`/api/sportsdb?mode=next&id=${id}`).then((r) => r.json()),
          fetch(`/api/sportsdb?mode=players&id=${id}`).then((r) => r.json()),
        ]);
        const tm: Team | null = t?.teams?.[0] ?? null;
        if (!tm) {
          setFailed(true);
          return;
        }
        setTeam(tm);
        setLast(l?.results ?? []);
        setNext(n?.events ?? []);
        setPlayers(pl?.player ?? []);

        // Try to find a current-season record: attempt "YYYY-YYYY+1", then "YYYY", then last year's pair
        if (tm.idLeague) {
          const y = new Date().getFullYear();
          const candidates = [`${y - 1}-${y}`, `${y}`, `${y}-${y + 1}`, `${y - 1}`];
          for (const season of candidates) {
            const tb = await fetch(`/api/sportsdb?mode=table&league=${tm.idLeague}&season=${season}`).then((r) => r.json());
            const row = (tb?.table ?? []).find((r2: TableRow) => r2.idTeam === tm.idTeam);
            if (row) {
              setRecord(row);
              break;
            }
          }
        }
      } catch {
        setFailed(true);
      }
    })();
  }, [id]);

  if (failed) return <main className="p-10 text-zinc-100">Team not found.</main>;
  if (!team) return <main className="p-10 text-zinc-100">Loading…</main>;

  const badge = team.strBadge ?? team.strTeamBadge ?? null;
  const desc = team.strDescriptionEN ?? "";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/search" className="text-sm text-zinc-400 hover:text-emerald-400">← Search</Link>
        <div className="mt-6 flex items-center gap-6">
          {badge && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badge} alt={team.strTeam} className="h-24 w-24 object-contain" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{team.strTeam}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {team.strLeague ?? ""}
              {team.strStadium ? ` · ${team.strStadium}` : ""}
              {team.intFormedYear ? ` · est. ${team.intFormedYear}` : ""}
            </p>
            {record && (
              <p className="mt-2 text-sm">
                <span className="rounded bg-emerald-400/10 px-2 py-1 font-semibold text-emerald-400">
                  {record.intWin}–{record.intLoss}
                  {record.intDraw && record.intDraw !== "0" ? `–${record.intDraw}` : ""}
                </span>{" "}
                <span className="text-zinc-500">· #{record.intRank} in league table this season</span>
              </p>
            )}
          </div>
        </div>

        {desc && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed text-zinc-300 ${expanded ? "" : "line-clamp-4"}`}>{desc}</p>
            {desc.length > 300 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-sm text-emerald-400 hover:underline"
              >
                {expanded ? "Show less" : "Read more…"}
              </button>
            )}
          </div>
        )}

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="font-semibold">Recent games</h2>
            <div className="mt-3 space-y-2">
              {last.map((e) => (
                <div key={e.idEvent} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
                  <div className="font-medium">{e.strEvent}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {e.dateEvent}
                    {e.intHomeScore != null && e.intAwayScore != null ? ` · ${e.intHomeScore}–${e.intAwayScore}` : ""}
                  </div>
                </div>
              ))}
              {last.length === 0 && <p className="text-sm text-zinc-500">No recent data.</p>}
            </div>
          </div>
          <div>
            <h2 className="font-semibold">Upcoming</h2>
            <div className="mt-3 space-y-2">
              {next.map((e) => (
                <div key={e.idEvent} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
                  <div className="font-medium">{e.strEvent}</div>
                  <div className="mt-1 text-xs text-zinc-500">{e.dateEvent}</div>
                </div>
              ))}
              {next.length === 0 && <p className="text-sm text-zinc-500">Nothing scheduled.</p>}
            </div>
          </div>
        </div>

        <h2 className="mt-10 font-semibold">Roster</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {players.map((p) => (
            <div key={p.idPlayer} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
              <div className="font-medium">{p.strPlayer}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{p.strPosition ?? ""}</div>
            </div>
          ))}
          {players.length === 0 && (
            <p className="col-span-full text-sm text-zinc-500">
              Roster not available on the free data tier for this team.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}