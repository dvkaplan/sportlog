"use client";
import { useEffect, useState } from "react";

type Cat = {
  name: string;
  labels: string[];
  seasons: { season: string; team: string; stats: (string | number)[] }[];
  totals: (string | number)[];
};

export default function PlayerStatsGeneric({ endpoint, query }: { endpoint: string; query: string }) {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const j = await fetch(`${endpoint}?${query}`).then((r) => r.json());
        if (j?.error || !j?.categories?.length) { setFailed(true); return; }
        setCats(j.categories);
      } catch { setFailed(true); }
    })();
  }, [endpoint, query]);

  if (failed) return null;
  if (!cats) return <p className="mt-8 text-sm text-zinc-500">Loading career stats…</p>;

  const cat = cats[active];
  const teams = [...new Set(cat.seasons.map((s) => s.team).filter(Boolean))];

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Career stats</h2>
        {cats.length > 1 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {cats.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setActive(i)}
                className={`rounded-full px-4 py-1 transition ${
                  active === i ? "bg-emerald-400 font-semibold text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-emerald-400"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {teams.length > 0 && (
        <p className="mt-2 text-sm text-zinc-400">
          Teams: <span className="text-zinc-300">{teams.join(" · ")}</span>
        </p>
      )}
      <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Season</th>
              <th className="px-3 py-2 text-left">Team</th>
              {cat.labels.map((l, li) => (
                <th key={`${l}-${li}`} className="px-3 py-2 text-right">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cat.seasons.map((s, i) => (
              <tr key={`${s.season}-${i}`} className="border-t border-zinc-800/60 hover:bg-zinc-900/50">
                <td className="px-3 py-1.5">{s.season}</td>
                <td className="px-3 py-1.5 font-medium">{s.team}</td>
                {s.stats.map((v, k) => (
                  <td key={k} className="px-3 py-1.5 text-right">{v}</td>
                ))}
              </tr>
            ))}
            {cat.totals.length > 0 && (
              <tr className="border-t-2 border-zinc-700 bg-zinc-900 font-semibold">
                <td className="px-3 py-2">Career</td>
                <td className="px-3 py-2" />
                {cat.totals.map((v, k) => (
                  <td key={k} className="px-3 py-2 text-right">{v}</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}