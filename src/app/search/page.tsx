"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Team = {
  idTeam: string;
  strTeam: string;
  strLeague: string | null;
  strSport: string | null;
  strBadge: string | null;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const data = await fetch(`/api/sportsdb?mode=findteams&q=${encodeURIComponent(q)}`).then((r) => r.json());
        setResults(data?.teams ?? []);
      } catch {
        setResults([]);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">Search teams</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Covers NBA, NFL, MLB, NHL, and major soccer leagues. Try a city: &quot;Chicago&quot;.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chicago, Lakers, Arsenal…"
          className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-emerald-400"
        />
        {busy && <p className="mt-3 text-sm text-zinc-500">Searching…</p>}
        <div className="mt-6 space-y-2">
          {results.map((t) => (
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
                  {t.strSport ?? ""}{t.strLeague ? ` · ${t.strLeague}` : ""}
                </div>
              </div>
            </Link>
          ))}
          {!busy && q.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-zinc-500">No teams found in the indexed leagues.</p>
          )}
        </div>
      </div>
    </main>
  );
}