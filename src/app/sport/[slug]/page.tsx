import Link from "next/link";
import { getSport, getGamesBySport } from "@/lib/data";

export default async function SportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sport = getSport(slug);
  const games = getGamesBySport(slug);
  if (!sport) return <main className="p-10 text-zinc-100">Sport not found.</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/" className="text-sm text-zinc-400 hover:text-emerald-400">← All sports</Link>
        <h1 className="mt-4 text-3xl font-bold">{sport.emoji} {sport.name}</h1>
        <div className="mt-6 flex gap-2 text-sm">
          <span className="rounded-full bg-emerald-400 px-4 py-1.5 font-medium text-zinc-950">Iconic Games</span>
          <span className="rounded-full border border-zinc-800 px-4 py-1.5 text-zinc-500">Teams (soon)</span>
          <span className="rounded-full border border-zinc-800 px-4 py-1.5 text-zinc-500">Eras (soon)</span>
          <span className="rounded-full border border-zinc-800 px-4 py-1.5 text-zinc-500">Players (soon)</span>
        </div>
        <div className="mt-8 space-y-3">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-400"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{g.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">{g.blurb}</div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {g.league} · {g.date} {g.score ? `· ${g.score}` : ""}
                  </div>
                </div>
                {g.championship && (
                  <span className="shrink-0 rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-400">🏆 Title</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}