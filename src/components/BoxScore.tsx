"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Row = { name: string; playerId: string | null; cells: (string | number)[] };
type Group = { title: string; columns: string[]; rows: Row[] };
type Box = { teamStats: { label: string; away: string | number; home: string | number }[]; groups: Group[] };

export default function BoxScore({ id, espn, awayName, homeName }: { id: string; espn?: string | null; awayName: string; homeName: string }) {
  const [box, setBox] = useState<Box | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/sportsdb?mode=boxscore&id=${encodeURIComponent(id)}${espn ? `&espn=${espn}` : ""}`);
        if (!r.ok) { setFailed(true); return; }
        const d = (await r.json()) as Box;
        if (!d || (!d.groups?.length && !d.teamStats?.length)) { setFailed(true); return; }
        setBox(d);
      } catch { setFailed(true); }
    })();
  }, [id, espn]);

  if (failed) return <p className="mt-6 text-xs text-zinc-600">Detailed box score unavailable for this game.</p>;
  if (!box) return <p className="mt-6 text-sm text-zinc-500">Loading box score…</p>;

  return (
    <div className="mt-8 space-y-4">
      {box.teamStats.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
            <span className="truncate text-left text-emerald-400">{awayName}</span><span>Team Stats</span><span className="truncate text-right text-emerald-400">{homeName}</span>
          </div>
          {box.teamStats.map((s, i) => (
            <div key={`${s.label}-${i}`} className="grid grid-cols-3 px-4 py-1.5 text-center text-sm odd:bg-zinc-900 even:bg-zinc-950/50">
              <span className="text-left font-medium">{s.away}</span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</span>
              <span className="text-right font-medium">{s.home}</span>
            </div>
          ))}
        </div>
      )}
      {box.groups.map((g) => (
        <div key={g.title} className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-300">{g.title}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-1.5 text-left font-normal">Player</th>
                {g.columns.map((c) => <th key={c} className="px-2 py-1.5 text-right font-normal">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={i} className="odd:bg-zinc-900 even:bg-zinc-950/50">
                  <td className="max-w-[160px] truncate px-4 py-1.5">
                    {r.playerId ? (
                      <Link href={`/player/${r.playerId}`} className="hover:text-emerald-400 hover:underline underline-offset-4">{r.name}</Link>
                    ) : r.name}
                  </td>
                  {r.cells.map((c, j) => <td key={j} className="px-2 py-1.5 text-right">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}