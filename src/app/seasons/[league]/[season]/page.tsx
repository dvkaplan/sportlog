import Link from "next/link";
import SeasonPicker from "@/components/SeasonPicker";
import SeasonRating from "@/components/SeasonRating";
import SeasonFanLists from "@/components/SeasonFanLists";

type HistGame = { id: string; week?: string; type?: string; date: string; away: string; home: string; as: number | null; hs: number | null; ot?: boolean; gameNo?: number };

const NFL_ROUNDS: Record<string, string> = { WC: "Wild Card", DIV: "Divisional Round", CON: "Conference Championships", SB: "Super Bowl" };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function SeasonPage({ params }: { params: Promise<{ league: string; season: string }> }) {
  const { league, season } = await params;
  let games: HistGame[] = [];
  let seasons: string[] = [];
  try {
    games = (await import(`@/lib/seasons/${league}/${season}.json`)).default as HistGame[];
    seasons = (await import(`@/lib/seasons/${league}/index.json`)).default as string[];
  } catch {
    return <main className="p-10 text-zinc-100">Season not found.</main>;
  }

  type SeriesGroup = { label: string; games: HistGame[] };
  const groups: [string, HistGame[]][] = [];
  let playoffSeries: SeriesGroup[] = [];
  let finalsGroup: SeriesGroup | null = null;
  if (league === "nfl") {
    const by: Record<string, HistGame[]> = {};
    for (const g of games) {
      const key = g.type === "REG" ? `Week ${g.week}` : NFL_ROUNDS[g.type ?? ""] ?? g.type ?? "Other";
      (by[key] ??= []).push(g);
    }
    const order = (k: string) =>
      k.startsWith("Week") ? Number(k.slice(5)) : 100 + ["Wild Card", "Divisional Round", "Conference Championships", "Super Bowl"].indexOf(k);
    groups.push(...Object.entries(by).sort((a, b) => order(a[0]) - order(b[0])));
} else {
    const regular = games.filter((g) => g.type !== "PO");
    const playoffs = games.filter((g) => g.type === "PO");

    const by: Record<string, HistGame[]> = {};
    for (const g of regular) {
      const d = new Date(g.date);
      const key = isNaN(d.getTime()) ? "Other" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      (by[key] ??= []).push(g);
    }
    groups.push(...Object.entries(by).sort((a, b) => (a[1][0]?.date ?? "").localeCompare(b[1][0]?.date ?? "")));

    const seriesMap: Record<string, HistGame[]> = {};
    for (const g of playoffs) {
      const key = [g.home, g.away].sort().join(" vs ");
      (seriesMap[key] ??= []).push(g);
    }
    const seriesList = Object.values(seriesMap)
      .map((gs) => [...gs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")))
      .sort((a, b) => (a[0]?.date ?? "").localeCompare(b[0]?.date ?? ""));

    const built: SeriesGroup[] = seriesList.map((gs) => {
      const [t1, t2] = [gs[0].home, gs[0].away];
      let w1 = 0, w2 = 0;
      for (const g of gs) {
        if (g.hs == null || g.as == null) continue;
        const winner = g.hs > g.as ? g.home : g.away;
        if (winner === t1) w1++; else if (winner === t2) w2++;
      }
      const champ = w1 >= w2 ? t1 : t2;
      const loser = w1 >= w2 ? t2 : t1;
      return {
        label: `${champ} def. ${loser} ${Math.max(w1, w2)}–${Math.min(w1, w2)}`,
        games: gs.map((g, i) => ({ ...g, gameNo: i + 1 })),
      };
    });
    if (built.length > 0) {
    const FINALS: Record<string, string> = { nba: "NBA Finals", nhl: "Stanley Cup Final", mlb: "World Series" };
      finalsGroup = { ...built[built.length - 1], label: `${FINALS[league] ?? "Finals"}: ${built[built.length - 1].label}` };
      playoffSeries = built.slice(0, -1);
    }
  }

  const LEAGUE_NAMES: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };
  const leagueName = LEAGUE_NAMES[league] ?? league.toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{leagueName} · {season} season</h1>
          <SeasonPicker league={league} seasons={seasons} current={season} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">{games.length} games — every one rateable.</p>
        <SeasonRating league={league} season={season} label={`${leagueName} ${season} season`} />
        <SeasonFanLists label={`${leagueName} ${season} season`} altLabel={`${season} ${leagueName} season`} />
        <div className="mt-8 space-y-3">
          {groups.map(([label, gs]) => (
            <details key={label} className="rounded-xl border border-zinc-800 bg-zinc-900" open={label.includes("Super Bowl") || label.includes("NBA Finals")}>
              <summary className="cursor-pointer select-none px-5 py-3 font-semibold hover:text-emerald-400">
                {label} <span className="ml-2 text-xs font-normal text-zinc-500">{gs.length} games</span>
              </summary>
              <div className="space-y-2 border-t border-zinc-800 p-4">
                {gs.map((g) => (
                  <Link key={g.id} href={`/game/${g.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm transition hover:border-emerald-400">
                    <span className="min-w-0 truncate font-medium">{g.gameNo ? `Game ${g.gameNo}: ` : ""}{g.away} @ {g.home}</span>
                    <span className="ml-4 shrink-0 text-zinc-400">
                      {g.as != null && g.hs != null ? `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}` : g.date}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          ))}
          {playoffSeries.length > 0 && (
            <details className="rounded-xl border border-amber-400/30 bg-zinc-900">
              <summary className="cursor-pointer select-none px-5 py-3 font-semibold text-amber-300 hover:text-amber-200">
                Playoffs <span className="ml-2 text-xs font-normal text-zinc-500">{playoffSeries.length} series</span>
              </summary>
              <div className="space-y-2 border-t border-zinc-800 p-4">
                {playoffSeries.map((s) => (
                  <details key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-950">
                    <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium hover:text-emerald-400">
                      {s.label} <span className="ml-2 text-xs font-normal text-zinc-500">{s.games.length} games</span>
                    </summary>
                    <div className="space-y-2 border-t border-zinc-800 p-3">
                      {s.games.map((g) => (
                        <Link key={g.id} href={`/game/${g.id}`}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm transition hover:border-emerald-400">
                          <span className="min-w-0 truncate font-medium">{g.gameNo ? `Game ${g.gameNo}: ` : ""}{g.away} @ {g.home}</span>
                          <span className="ml-4 shrink-0 text-zinc-400">
                            {g.as != null && g.hs != null ? `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}` : g.date}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          )}
          {finalsGroup && (
            <details open className="rounded-xl border border-amber-400/60 bg-zinc-900">
              <summary className="cursor-pointer select-none px-5 py-3 font-semibold text-amber-300 hover:text-amber-200">
                {finalsGroup.label}
              </summary>
              <div className="space-y-2 border-t border-zinc-800 p-4">
                {finalsGroup.games.map((g) => (
                  <Link key={g.id} href={`/game/${g.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm transition hover:border-emerald-400">
                    <span className="min-w-0 truncate font-medium">{g.gameNo ? `Game ${g.gameNo}: ` : ""}{g.away} @ {g.home}</span>
                    <span className="ml-4 shrink-0 text-zinc-400">
                      {g.as != null && g.hs != null ? `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}` : g.date}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}