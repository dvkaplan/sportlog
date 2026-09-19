import Link from "next/link";
import { readFile } from "fs/promises";
import path from "path";
import { getSport, getGamesBySport, getErasBySport } from "@/lib/data";
import { getFightersBySport } from "@/lib/fighters";
import BackLink from "@/components/BackLink";
import leaguesData from "@/lib/leagues.json";
import { getPopularGames, getUpcomingGames, getPopularEntities, type PopularGame } from "@/lib/popular";
import nflIdx from "@/lib/seasons/nfl/index.json";
import nbaIdx from "@/lib/seasons/nba/index.json";
import nhlIdx from "@/lib/seasons/nhl/index.json";
import mlbIdx from "@/lib/seasons/mlb/index.json";
import eplIdx from "@/lib/seasons/epl/index.json";
import laligaIdx from "@/lib/seasons/laliga/index.json";
import serieaIdx from "@/lib/seasons/seriea/index.json";
import bundesligaIdx from "@/lib/seasons/bundesliga/index.json";
import ligue1Idx from "@/lib/seasons/ligue1/index.json";

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
type SeasonGame = { hs?: number | null; as?: number | null };
async function latestStarted(lg: string, idx: string[]): Promise<string> {
  for (let i = idx.length - 1; i >= Math.max(0, idx.length - 3); i--) {
    try {
      const games = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "seasons", lg, `${idx[i]}.json`), "utf8")) as SeasonGame[];
      if (games.some((g) => g.hs != null && g.as != null)) return idx[i];
    } catch { /* try previous */ }
  }
  return idx[idx.length - 1] ?? "";
}
const LEAGUE_PAGES: Record<string, { lg: string; label: string; idx: string[] }> = {
  football: { lg: "nfl", label: "NFL", idx: nflIdx },
  basketball: { lg: "nba", label: "NBA", idx: nbaIdx },
  baseball: { lg: "mlb", label: "MLB", idx: mlbIdx },
  hockey: { lg: "nhl", label: "NHL", idx: nhlIdx },
};

function Row({ g, i, href }: { g: PopularGame; i?: number; href: string }) {
  return (
    <li className="border-b border-zinc-800">
      <Link href={href} className="group flex items-center gap-5 py-4 transition hover:bg-zinc-900 sm:gap-7">
        {i != null && <span className="w-8 shrink-0 text-right text-2xl text-zinc-100" style={display}>{String(i + 1).padStart(2, "0")}</span>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-medium leading-tight group-hover:text-accent">{g.title}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-300">{[g.league, g.date, g.score].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-3xl leading-none text-zinc-100" style={display}>{g.avg ? g.avg.toFixed(1) : "—"}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-zinc-400">{g.ratings ? `${g.ratings} rating${g.ratings === 1 ? "" : "s"}` : g.score ? "unrated" : "upcoming"}</div>
        </div>
      </Link>
    </li>
  );
}
function SideList({ title, items, empty }: { title: string; items: PopularGame[]; empty: string }) {
  return (
    <div>
      <h2 className="border-b border-zinc-700 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">{title}</h2>
      {items.length === 0 ? <p className="py-4 text-sm text-zinc-400">{empty}</p> : (
        <ol>
          {items.map((e, i) => (
            <li key={e.id} className="border-b border-zinc-800">
              <Link href={e.href ?? "#"} className="group flex items-center gap-3 py-3 transition hover:bg-zinc-900">
                <span className="w-6 shrink-0 text-right text-lg text-zinc-100" style={display}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:text-accent">{e.title}</span>
                  <span className="block truncate text-[10px] uppercase tracking-[0.12em] text-zinc-400">{e.league}</span>
                </span>
                <span className="text-lg leading-none text-zinc-100" style={display}>{e.avg ? e.avg.toFixed(1) : "—"}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function SportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sport = getSport(slug);
  if (!sport) return <main className="p-10 text-zinc-100">Sport not found.</main>;
  const L = leaguesData as Record<string, { badge: string | null; logo: string | null }>;

  const page = LEAGUE_PAGES[slug];
  if (page) {
    const [recent, upcoming, players, coaches, latest] = await Promise.all([
      getPopularGames(10, 14, [page.lg]), getUpcomingGames(page.lg, 7),
      getPopularEntities("players", 8, 365, page.label), getPopularEntities("coaches", 6, 365, page.label),
      latestStarted(page.lg, page.idx),
    ]);
    const earliest = page.idx[0] ?? "";
    const badge = L[page.lg]?.badge ?? L[page.lg]?.logo ?? null;
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-10">
          <BackLink fallback="/" />
          <header className="mt-6 flex items-end gap-5 border-b border-zinc-700 pb-6">
            {badge && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={badge} alt="" className="h-16 w-16 object-contain" />
            )}
            <h1 className="text-6xl leading-none tracking-tight sm:text-7xl" style={display}>{page.label}</h1>
          </header>

          <Link href={`/seasons/${page.lg}/${latest}`} className="group block border-b border-zinc-800 py-5 transition hover:bg-zinc-900">
            <div className="text-lg font-medium text-accent">Browse every {page.label} game</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-300">Every season &amp; game starting from {earliest}</div>
          </Link>

          <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_320px]">
            <section>
              <h2 className="border-b border-zinc-700 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">Recent</h2>
              <ol>{recent.map((g, i) => <Row key={g.id} g={g} i={i} href={`/game/${g.id}`} />)}</ol>
              {recent.length === 0 && <p className="py-6 text-sm text-zinc-400">No games in the last two weeks.</p>}
              {upcoming.length > 0 && (
                <>
                  <h2 className="mt-12 border-b border-zinc-700 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">Upcoming</h2>
                  <ol>{upcoming.map((g) => <Row key={g.id} g={g} href={`/game/${g.id}`} />)}</ol>
                </>
              )}
            </section>
            <aside className="space-y-10">
              <SideList title="Trending players" items={players} empty="No player ratings yet — be the first." />
              <SideList title="Trending coaches" items={coaches} empty="No coach ratings yet." />
            </aside>
          </div>
        </div>
      </main>
    );
  }

  // Soccer / MMA / Boxing — unchanged for now
  const games = getGamesBySport(slug);
  const eras = getErasBySport(slug);
  const fighters = slug === "boxing" || slug === "mma" ? getFightersBySport(slug) : [];
  const latest = (idx: string[]) => idx[idx.length - 1] ?? "";
  const BROWSE: [string, string, string][] = slug === "soccer"
    ? [["epl", "Premier League", latest(eplIdx)], ["laliga", "La Liga", latest(laligaIdx)], ["seriea", "Serie A", latest(serieaIdx)], ["bundesliga", "Bundesliga", latest(bundesligaIdx)], ["ligue1", "Ligue 1", latest(ligue1Idx)]]
    : [];
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <BackLink fallback="/" />
        <h1 className="mt-4 text-3xl font-bold">{sport.name}</h1>
        {eras.length > 0 && (
          <>
            <h2 className="mt-8 font-semibold">Eras</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {eras.map((e) => (
                <Link key={e.slug} href={`/era/${e.slug}`} className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm transition hover:border-accent hover:text-accent">
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
                <Link key={f.slug} href={`/fighter/${f.slug}`} className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm transition hover:border-accent hover:text-accent">
                  {f.name}{f.champion ? " 🏆" : ""}
                </Link>
              ))}
            </div>
          </>
        )}
        {BROWSE.length > 0 && (
          <div className="mt-8 space-y-2">
            {BROWSE.map(([lg, name, cur]) => (
              <Link key={lg} href={`/seasons/${lg}/${cur}`} className="block rounded-xl border border-accent/40 bg-accent/5 p-5 transition hover:border-accent">
                <div className="font-semibold text-accent">Browse every {name} game →</div>
                <div className="mt-1 text-sm text-zinc-400">Full season schedules, every game rateable — season by season.</div>
              </Link>
            ))}
          </div>
        )}
        <h2 className="mt-8 font-semibold">Iconic Games</h2>
        <div className="mt-3 space-y-3">
          {games.map((g) => (
            <Link key={g.id} href={`/game/${g.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-accent">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{g.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">{g.blurb}</div>
                  <div className="mt-2 text-xs text-zinc-500">{g.league} · {g.date} {g.score ? `· ${g.score}` : ""}</div>
                </div>
                {g.championship && <span className="shrink-0 rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-400">🏆 Title</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}