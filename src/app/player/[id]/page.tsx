"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

type Player = {
  idPlayer: string;
  strPlayer: string;
  strTeam: string | null;
  idTeam: string | null;
  strSport: string | null;
  strPosition: string | null;
  strNationality: string | null;
  dateBorn: string | null;
  strHeight: string | null;
  strWeight: string | null;
  strDescriptionEN: string | null;
  strCutout: string | null;
  strThumb: string | null;
};

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [player, setPlayer] = useState<Player | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetch(`/api/sportsdb?mode=player&id=${id}`).then((r) => r.json());
        const p = data?.players?.[0] ?? null;
        if (!p) {
          setFailed(true);
          return;
        }
        setPlayer(p);
      } catch {
        setFailed(true);
      }
    })();
  }, [id]);

  if (failed) return <main className="p-10 text-zinc-100">Player not found.</main>;
  if (!player) return <main className="p-10 text-zinc-100">Loading…</main>;

  const photo = player.strCutout ?? player.strThumb ?? null;
  const desc = player.strDescriptionEN ?? "";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {player.idTeam ? (
          <Link href={`/team/${player.idTeam}`} className="text-sm text-zinc-400 hover:text-emerald-400">
            ← {player.strTeam ?? "Team"}
          </Link>
        ) : (
          <Link href="/search" className="text-sm text-zinc-400 hover:text-emerald-400">← Search</Link>
        )}
        <div className="mt-6 flex items-center gap-6">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={player.strPlayer} className="h-28 w-28 rounded-xl object-cover object-top" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-zinc-900 text-3xl">👤</div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{player.strPlayer}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {player.strPosition ?? ""}
              {player.strTeam ? ` · ${player.strTeam}` : ""}
              {player.strNationality ? ` · ${player.strNationality}` : ""}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {player.dateBorn ? `Born ${player.dateBorn}` : ""}
              {player.strHeight ? ` · ${player.strHeight}` : ""}
              {player.strWeight ? ` · ${player.strWeight}` : ""}
            </p>
          </div>
        </div>

        {desc && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed text-zinc-300 ${expanded ? "" : "line-clamp-5"}`}>{desc}</p>
            {desc.length > 350 && (
              <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm text-emerald-400 hover:underline">
                {expanded ? "Show less" : "Read more…"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}