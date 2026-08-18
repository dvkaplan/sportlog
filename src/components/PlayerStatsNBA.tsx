"use client";
import { useEffect, useState } from "react";

type SeasonRow = {
  season: string; team: string; gp: number; min: number; pts: number;
  reb: number; ast: number; stl: number; blk: number;
  fgPct: number; fg3Pct: number; ftPct: number;
};
type StatsData = {
  regular: SeasonRow[]; playoffs: SeasonRow[];
  careerRegular: SeasonRow[]; careerPlayoffs: SeasonRow[];
};

const pct = (v: number) => (v ? (v * 100).toFixed(1) : "—");

function StatTable({ title, rows, career }: { title: string; rows: SeasonRow[]; career: SeasonRow | null }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">{title}</h3>
      <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Season</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-right">GP</th>
              <th className="px-3 py-2 text-right">PTS</th>
              <th className="px-3 py-2 text-right">REB</th>
              <th className="px-3 py-2 text-right">AST</th>
              <th className="px-3 py-2 text-right">STL</th>
              <th className="px-3 py-2 text-right">BLK</th>
              <th className="px-3 py-2 text-right">FG%</th>
              <th className="px-3 py-2 text-right">3P%</th>
              <th className="px-3 py-2 text-right">FT%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.season}-${r.team}-${i}`} className="border-t border-zinc-800/60 hover:bg-zinc-900/50">
                <td className="px-3 py-1.5">{r.season}</td>
                <td className="px-3 py-1.5 font-medium">{r.team}</td>
                <td className="px-3 py-1.5 text-right">{r.gp}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-emerald-400">{r.pts}</td>
                <td className="px-3 py-1.5 text-right">{r.reb}</td>
                <td className="px-3 py-1.5 text-right">{r.ast}</td>
                <td className="px-3 py-1.5 text-right">{r.stl}</td>
                <td className="px-3 py-1.5 text-right">{r.blk}</td>
                <td className="px-3 py-1.5 text-right">{pct(r.fgPct)}</td>
                <td className="px-3 py-1.5 text-right">{pct(r.fg3Pct)}</td>
                <td className="px-3 py-1.5 text-right">{pct(r.ftPct)}</td>
              </tr>
            ))}
            {career && (
              <tr className="border-t-2 border-zinc-700 bg-zinc-900 font-semibold">
                <td className="px-3 py-2">Career</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right">{career.gp}</td>
                <td className="px-3 py-2 text-right text-emerald-400">{career.pts}</td>
                <td className="px-3 py-2 text-right">{career.reb}</td>
                <td className="px-3 py-2 text-right">{career.ast}</td>
                <td className="px-3 py-2 text-right">{career.stl}</td>
                <td className="px-3 py-2 text-right">{career.blk}</td>
                <td className="px-3 py-2 text-right">{pct(career.fgPct)}</td>
                <td className="px-3 py-2 text-right">{pct(career.fg3Pct)}</td>
                <td className="px-3 py-2 text-right">{pct(career.ftPct)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlayerStatsNBA({ nbaId }: { nbaId: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"regular" | "playoffs">("regular");

  useEffect(() => {
    (async () => {
      try {
        const j = await fetch(`/api/nba-stats?id=${nbaId}`).then((r) => r.json());
        if (j?.error) { setFailed(true); return; }
        setData(j);
      } catch { setFailed(true); }
    })();
  }, [nbaId]);

  if (failed || (data && data.regular.length === 0 && data.playoffs.length === 0)) return null;
  if (!data) return <p className="mt-8 text-sm text-zinc-500">Loading career stats…</p>;

  const teams = [...new Set(data.regular.map((r) => r.team).filter((t) => t && t !== "TOT"))];

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Career stats</h2>
        <div className="flex gap-2 text-sm">
          {(["regular", "playoffs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1 capitalize transition ${
                tab === t ? "bg-emerald-400 font-semibold text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-emerald-400"
              }`}
            >
              {t === "regular" ? "Regular season" : "Playoffs"}
            </button>
          ))}
        </div>
      </div>
      {teams.length > 0 && (
        <p className="mt-2 text-sm text-zinc-400">
          Teams: <span className="text-zinc-300">{teams.join(" · ")}</span>
        </p>
      )}
      {tab === "regular" ? (
        <StatTable title="Regular season (per game)" rows={data.regular} career={data.careerRegular[0] ?? null} />
      ) : (
        <StatTable title="Playoffs (per game)" rows={data.playoffs} career={data.careerPlayoffs[0] ?? null} />
      )}
    </div>
  );
}