import Link from "next/link";
import { getSport, getGamesBySport, getErasBySport } from "@/lib/data";
import { getFightersBySport } from "@/lib/fighters";
import BackLink from "@/components/BackLink";
import nflIdx from "@/lib/seasons/nfl/index.json";
import nbaIdx from "@/lib/seasons/nba/index.json";
import nhlIdx from "@/lib/seasons/nhl/index.json";
import mlbIdx from "@/lib/seasons/mlb/index.json";
import eplIdx from "@/lib/seasons/epl/index.json";
import laligaIdx from "@/lib/seasons/laliga/index.json";
import serieaIdx from "@/lib/seasons/seriea/index.json";
import bundesligaIdx from "@/lib/seasons/bundesliga/index.json";
import ligue1Idx from "@/lib/seasons/ligue1/index.json";
const latest = (idx: string[]) => idx[idx.length - 1] ?? "";

export default async function SportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sport = getSport(slug);
  const games = getGamesBySport(slug);
  const eras = getErasBySport(slug);
  const fighters = slug === "boxing" || slug === "mma" ? getFightersBySport(slug) : [];
  if (!sport) return <main className="p-10 text-zinc-100">Sport not found.</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <BackLink fallback="/" />
        <h1 className="mt-4 text-3xl font-bold">{sport.emoji} {sport.name}</h1>

        {eras.length > 0 && (
          <>
            <h2 className="mt-8 font-semibold">Eras</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {eras.map((e) => (
                <Link
                  key={e.slug}
                  href={`/era/${e.slug}`}
                  className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm transition hover:border-emerald-400 hover:text-emerald-400"
                >
                  {e.name} <span className="text-zinc-500">· {e.years}</span>
                </Link>
              ))}
            </div>
          </>
        )}

{fighters.length > 0 && (
          <>
            <h2 className="mt-8 font-semibold">Legendary Fighters</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {fighters.map((f) => (
                <Link
                  key={f.slug}
                  href={`/fighter/${f.slug}`}
                  className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm transition hover:border-emerald-400 hover:text-emerald-400"
                >
                  {f.name}{f.champion ? " 🏆" : ""}
                </Link>
              ))}
            </div>
          </>
        )}

        {(() => {
          const BROWSE: Record<string, [string, string, string][]> = {
            football: [["nfl", "NFL", latest(nflIdx)]],
            basketball: [["nba", "NBA", latest(nbaIdx)]],
            hockey: [["nhl", "NHL", latest(nhlIdx)]],
            baseball: [["mlb", "MLB", latest(mlbIdx)]],
            soccer: [["epl", "Premier League", latest(eplIdx)], ["laliga", "La Liga", latest(laligaIdx)], ["seriea", "Serie A", latest(serieaIdx)], ["bundesliga", "Bundesliga", latest(bundesligaIdx)], ["ligue1", "Ligue 1", latest(ligue1Idx)]],
          };
          const links = BROWSE[slug] ?? [];
          if (links.length === 0) return null;
          return (
            <div className="mt-8 space-y-2">
              {links.map(([lg, name, cur]) => (
                <Link key={lg} href={`/seasons/${lg}/${cur}`}
                  className="block rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-5 transition hover:border-emerald-400">
                  <div className="font-semibold text-emerald-400">Browse every {name} game →</div>
                  <div className="mt-1 text-sm text-zinc-400">Full season schedules, every game rateable — season by season.</div>
                </Link>
              ))}
            </div>
          );
        })()}
        <h2 className="mt-8 font-semibold">Iconic Games</h2>
        <div className="mt-3 space-y-3">
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