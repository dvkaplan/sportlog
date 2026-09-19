import Link from "next/link";
import leaguesData from "@/lib/leagues.json";
import { getPopularGames } from "@/lib/popular";
import eplIdx from "@/lib/seasons/epl/index.json";
import laligaIdx from "@/lib/seasons/laliga/index.json";
import serieaIdx from "@/lib/seasons/seriea/index.json";
import bundesligaIdx from "@/lib/seasons/bundesliga/index.json";
import ligue1Idx from "@/lib/seasons/ligue1/index.json";
import TrendingFeed from "@/components/TrendingFeed";

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
  const feed = await getPopularGames(10, 30);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14">
        <header className="border-b border-zinc-700 pb-8">
          <h1 className="text-6xl leading-none tracking-tight sm:text-7xl" style={display}>
            Sport<span className="text-accent">log</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm uppercase tracking-[0.2em] text-zinc-300">
            Rate, review, and rank every game ever played
          </p>
        </header>

        <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_320px]">
                    <TrendingFeed initial={feed} initialDays={30} />

          <aside>
            <h2 className="border-b border-zinc-700 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">Browse by league</h2>
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
                          <span className="text-sm font-semibold text-zinc-300" style={display}>{n.label.slice(0, 3).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium leading-tight group-hover:text-accent">{n.label}</span>
                        <span className="block text-[11px] uppercase tracking-[0.12em] text-zinc-300">{n.sub}</span>
                      </span>
                      <span className="text-zinc-100 transition group-hover:text-accent">→</span>
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