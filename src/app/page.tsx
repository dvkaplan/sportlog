import Link from "next/link";
import leaguesData from "@/lib/leagues.json";
import { getPopularGames } from "@/lib/popular";
import eplIdx from "@/lib/seasons/epl/index.json";
import laligaIdx from "@/lib/seasons/laliga/index.json";
import serieaIdx from "@/lib/seasons/seriea/index.json";
import bundesligaIdx from "@/lib/seasons/bundesliga/index.json";
import ligue1Idx from "@/lib/seasons/ligue1/index.json";

type LeagueMeta = { name: string; badge: string | null; logo: string | null };
const L = leaguesData as Record<string, LeagueMeta>;
const latest = (idx: string[]) => idx[idx.length - 1] ?? "";
const NAV: { key: string; label: string; sub: string; href: string }[] = [
  { key: "nfl", label: "NFL", sub: "Every game since 1966", href: "/sport/football" },
  { key: "nba", label: "NBA", sub: "Every game since 1946", href: "/sport/basketball" },
  { key: "mlb", label: "MLB", sub: "Every game since 1901", href: "/sport/baseball" },
  { key: "nhl", label: "NHL", sub: "Every game since 1917", href: "/sport/hockey" },
  { key: "epl", label: "Premier League", sub: "Since 1993", href: `/seasons/epl/${latest(eplIdx)}` },
  { key: "laliga", label: "La Liga", sub: "Since 1993", href: `/seasons/laliga/${latest(laligaIdx)}` },
  { key: "seriea", label: "Serie A", sub: "Since 1993", href: `/seasons/seriea/${latest(serieaIdx)}` },
  { key: "bundesliga", label: "Bundesliga", sub: "Since 1993", href: `/seasons/bundesliga/${latest(bundesligaIdx)}` },
  { key: "ligue1", label: "Ligue 1", sub: "Since 1993", href: `/seasons/ligue1/${latest(ligue1Idx)}` },
  { key: "ufc", label: "UFC", sub: "13,000+ fights", href: "/sport/mma" },
];
const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;

export default async function Home() {
  const feed = await getPopularGames(10);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14">
        <header className="border-b border-zinc-700 pb-8">
          <h1 className="text-6xl leading-none tracking-tight sm:text-7xl" style={display}>
            Sport<span className="text-amber-400">log</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm uppercase tracking-[0.2em] text-zinc-300">
            Rate, review and rank every game ever played
          </p>
        </header>

        <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="flex items-baseline justify-between border-b border-zinc-700 pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">Trending · last 14 days</h2>
              <Link href="/search" className="text-xs uppercase tracking-[0.15em] text-zinc-300 hover:text-amber-400">Search all →</Link>
            </div>
            <ol>
              {feed.map((g, i) => (
                <li key={g.id} className="border-b border-zinc-800">
                  <Link href={`/game/${g.id}`} className="group flex items-center gap-5 py-4 transition hover:bg-zinc-900 sm:gap-7">
                    <span className="w-8 shrink-0 text-right text-2xl text-zinc-500" style={display}>{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-medium leading-tight group-hover:text-amber-400">{g.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-400">
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
            </ol>
          </section>

          <aside>
            <h2 className="border-b border-zinc-700 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">Browse by league</h2>
            <ul>
              {NAV.map((n) => {
                const badge = L[n.key]?.badge ?? L[n.key]?.logo ?? null;
                return (
                  <li key={n.key} className="border-b border-zinc-800">
                    <Link href={n.href} className="group flex items-center gap-4 py-3 transition hover:bg-zinc-900">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                        {badge ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={badge} alt="" className="max-h-9 max-w-9 object-contain" />
                        ) : (
                          <span className="text-sm font-semibold text-zinc-400" style={display}>{n.label.slice(0, 3).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium leading-tight group-hover:text-amber-400">{n.label}</span>
                        <span className="block text-[11px] uppercase tracking-[0.12em] text-zinc-400">{n.sub}</span>
                      </span>
                      <span className="text-zinc-500 transition group-hover:text-amber-400">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}