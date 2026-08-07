import Link from "next/link";
import SeasonPicker from "@/components/SeasonPicker";

type HistGame = { id: string; week?: string; type?: string; date: string; away: string; home: string; as: number | null; hs: number | null; ot?: boolean };

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

  const groups: [string, HistGame[]][] = [];
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
    const by: Record<string, HistGame[]> = {};
    for (const g of games) {
      const d = new Date(g.date);
      const key = isNaN(d.getTime()) ? "Other" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      (by[key] ??= []).push(g);
    }
    groups.push(...Object.entries(by).sort((a, b) => (a[1][0]?.date ?? "").localeCompare(b[1][0]?.date ?? "")));
  }

  const leagueName = league === "nfl" ? "NFL" : league === "nba" ? "NBA" : league.toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{leagueName} · {season} season</h1>
          <SeasonPicker league={league} seasons={seasons} current={season} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">{games.length} games — every one rateable.</p>
        <div className="mt-8 space-y-3">
          {groups.map(([label, gs]) => (
            <details key={label} className="rounded-xl border border-zinc-800 bg-zinc-900" open={label.includes("Super Bowl")}>
              <summary className="cursor-pointer select-none px-5 py-3 font-semibold hover:text-emerald-400">
                {label} <span className="ml-2 text-xs font-normal text-zinc-500">{gs.length} games</span>
              </summary>
              <div className="space-y-2 border-t border-zinc-800 p-4">
                {gs.map((g) => (
                  <Link key={g.id} href={`/game/${g.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm transition hover:border-emerald-400">
                    <span className="min-w-0 truncate font-medium">{g.away} @ {g.home}</span>
                    <span className="ml-4 shrink-0 text-zinc-400">
                      {g.as != null && g.hs != null ? `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}` : g.date}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}