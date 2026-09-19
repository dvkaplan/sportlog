"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PopularGame } from "@/lib/popular";

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const PERIODS: [number, string][] = [[7, "This week"], [30, "This month"], [365, "This year"]];

export default function TrendingFeed({ initial, initialDays = 30 }: { initial: PopularGame[]; initialDays?: number }) {
  const [days, setDays] = useState(initialDays);
  const [games, setGames] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (days === initialDays) { setGames(initial); return; }
    let live = true;
    setLoading(true);
    fetch(`/api/trending?days=${days}`).then((r) => r.json()).then((j) => { if (live) setGames(j.games ?? []); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [days, initial, initialDays]);

  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-zinc-700 pb-2">
        <div className="flex items-baseline gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">Trending</h2>
          <span className="relative inline-block">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="cursor-pointer appearance-none border-b border-accent/50 bg-transparent pb-0.5 pr-4 text-xs uppercase tracking-[0.15em] text-accent focus:outline-none [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
            >
              {PERIODS.map(([d, label]) => <option key={d} value={d}>{label}</option>)}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-0 top-0.5 text-[9px] text-accent">▼</span>
          </span>
        </div>
        <Link href="/search" className="text-xs uppercase tracking-[0.15em] text-zinc-300 hover:text-accent">Search all →</Link>
      </div>
      <ol className={loading ? "opacity-50 transition" : "transition"}>
        {games.map((g, i) => (
          <li key={g.id} className="border-b border-zinc-800">
            <Link href={`/game/${g.id}`} className="group flex items-center gap-5 py-4 transition hover:bg-zinc-900 sm:gap-7">
              <span className="w-8 shrink-0 text-right text-2xl text-zinc-100" style={display}>{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-medium leading-tight group-hover:text-accent">{g.title}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-300">
                  {g.league}{g.date ? ` · ${g.date}` : ""}{g.score ? ` · ${g.score}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-3xl leading-none text-zinc-100" style={display}>{g.avg ? g.avg.toFixed(1) : "—"}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-zinc-400">
                  {g.ratings ? `${g.ratings} rating${g.ratings === 1 ? "" : "s"}` : "unrated"}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {!loading && games.length === 0 && <li className="py-8 text-sm text-zinc-400">Nothing rated in this window yet.</li>}
      </ol>
    </section>
  );
}