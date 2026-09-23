import Link from "next/link";
import SeasonPicker from "@/components/SeasonPicker";
import SeasonRating from "@/components/SeasonRating";
import SeasonFanLists from "@/components/SeasonFanLists";
import leaguesData from "@/lib/leagues.json";

type HistGame = { id: string; week?: string; type?: string; date: string; away: string; home: string; as: number | null; hs: number | null; ot?: boolean; gameNo?: number };
type SeriesGroup = { label: string; games: HistGame[] };

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const NFL_ROUNDS: Record<string, string> = { WC: "Wild Card", DIV: "Divisional Round", CON: "Conference Championships", SB: "Super Bowl", CHAMP: "Championship" };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const LEAGUE_NAMES: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };
const FINALS: Record<string, string> = { nba: "NBA Finals", nhl: "Stanley Cup Final", mlb: "World Series" };
const shortDate = (d: string) => { const t = new Date(d); return isNaN(t.getTime()) ? d : `${MONTHS[t.getUTCMonth()].slice(0, 3)} ${t.getUTCDate()}`; };
const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function GameRow({ g, final }: { g: HistGame; final?: boolean }) {
  const score = g.as != null && g.hs != null ? `${g.as}–${g.hs}${g.ot ? " (OT)" : ""}` : "";
  return (
    <li className={`border-b border-zinc-800 ${final ? "border-l-2 border-l-accent pl-4" : ""}`}>
      <Link href={`/game/${g.id}`} className="group flex items-center gap-4 py-3 transition hover:bg-zinc-900 sm:gap-6">
        <span className="w-14 shrink-0 text-[11px] uppercase tracking-[0.12em] text-zinc-300">{shortDate(g.date)}</span>
        <span className="min-w-0 flex-1 truncate text-base font-medium leading-tight group-hover:text-accent">
          {g.gameNo ? <span className="mr-2 text-zinc-400">G{g.gameNo}</span> : null}{g.away} <span className="text-zinc-500">@</span> {g.home}
        </span>
        <span className={`shrink-0 text-xl leading-none ${final ? "text-accent" : "text-zinc-100"}`} style={display}>{score || <span className="text-sm text-zinc-500">—</span>}</span>
      </Link>
    </li>
  );
}
function Section({ title, count, accent, children }: { title: string; count?: number; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className={`flex items-baseline gap-3 border-b pb-2 ${accent ? "border-accent/50" : "border-zinc-700"}`}>
        <span className={`text-2xl leading-none ${accent ? "text-accent" : "text-zinc-100"}`} style={display}>{title}</span>
        {count != null && <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400">{count} game{count === 1 ? "" : "s"}</span>}
      </h2>
      <ol>{children}</ol>
    </section>
  );
}

export default async function SeasonPage({ params, searchParams }: { params: Promise<{ league: string; season: string }>; searchParams: Promise<{ g?: string }> }) {
  const { league, season } = await params;
  const { g: gParam } = await searchParams;
  let games: HistGame[] = [];
  let seasons: string[] = [];
  try {
    games = (await import(`@/lib/seasons/${league}/${season}.json`)).default as HistGame[];
    seasons = (await import(`@/lib/seasons/${league}/index.json`)).default as string[];
  } catch {
    return <main className="p-10 text-zinc-100">Season not found.</main>;
  }

  const regularGroups: [string, HistGame[]][] = [];
  const nflPost: [string, HistGame[]][] = [];
  let playoffSeries: SeriesGroup[] = [];
  let finalsGroup: SeriesGroup | null = null;
  if (league === "nfl") {
    const by: Record<string, HistGame[]> = {};
    for (const g of games) {
      const key = g.type === "REG" ? `Week ${g.week}` : NFL_ROUNDS[g.type ?? ""] ?? g.type ?? "Other";
      (by[key] ??= []).push(g);
    }
    const order = (k: string) => k.startsWith("Week") ? Number(k.slice(5)) : 100 + ["Wild Card", "Divisional Round", "Conference Championships", "Championship", "Super Bowl"].indexOf(k);
    for (const e of Object.entries(by).sort((a, b) => order(a[0]) - order(b[0]))) (e[0].startsWith("Week") ? regularGroups : nflPost).push(e);
  } else {
    const regular = games.filter((g) => g.type !== "PO" && g.type !== "WS");
    const playoffs = games.filter((g) => g.type === "PO" || g.type === "WS");
    const by: Record<string, HistGame[]> = {};
    for (const g of regular) {
      const d = new Date(g.date);
      const key = isNaN(d.getTime()) ? "Other" : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      (by[key] ??= []).push(g);
    }
    regularGroups.push(...Object.entries(by).sort((a, b) => (a[1][0]?.date ?? "").localeCompare(b[1][0]?.date ?? "")));
    const seriesMap: Record<string, HistGame[]> = {};
    for (const g of playoffs) { const key = [g.home, g.away].sort().join(" vs "); (seriesMap[key] ??= []).push(g); }
    const built: SeriesGroup[] = Object.values(seriesMap)
      .map((gs) => [...gs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")))
      .sort((a, b) => (a[0]?.date ?? "").localeCompare(b[0]?.date ?? ""))
      .map((gs) => {
        const [t1, t2] = [gs[0].home, gs[0].away];
        let w1 = 0, w2 = 0;
        for (const g of gs) { if (g.hs == null || g.as == null) continue; const w = g.hs > g.as ? g.home : g.away; if (w === t1) w1++; else if (w === t2) w2++; }
        const champ = w1 >= w2 ? t1 : t2, loser = w1 >= w2 ? t2 : t1;
        return { label: `${champ} def. ${loser} ${Math.max(w1, w2)}–${Math.min(w1, w2)}`, games: gs.map((g, i) => ({ ...g, gameNo: i + 1 })) };
      });
    if (built.length > 0) { finalsGroup = built[built.length - 1]; playoffSeries = built.slice(0, -1); }
  }

  const leagueName = LEAGUE_NAMES[league] ?? league.toUpperCase();
  const L = leaguesData as Record<string, { badge: string | null; logo: string | null }>;
  const badge = L[league]?.badge ?? L[league]?.logo ?? null;
  const hasPost = nflPost.length > 0 || playoffSeries.length > 0 || !!finalsGroup;
  const jump = regularGroups.map(([label]) => ({ label: label.startsWith("Week") ? `W${label.slice(5)}` : label.slice(0, 3), id: anchor(label) }));
  const finalTitle = league === "nfl" ? null : FINALS[league] ?? "Finals";
  const valid = new Set([...jump.map((j) => j.id), ...(hasPost ? ["postseason"] : [])]);
  const sel = gParam && valid.has(gParam) ? gParam : jump[0]?.id ?? "postseason";
  const tab = (id: string) => `/seasons/${league}/${season}?g=${id}`;
  const current = regularGroups.find(([label]) => anchor(label) === sel);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-10">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-zinc-700 pb-6">
          <div className="flex items-end gap-4">
            {badge && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={badge} alt="" className="h-12 w-12 object-contain" />
            )}
            <div>
              <h1 className="text-5xl leading-none tracking-tight sm:text-6xl" style={display}>{season} {leagueName}</h1>
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-zinc-300">{games.length} games</p>
            </div>
          </div>
          <SeasonPicker league={league} seasons={seasons} current={season} />
        </header>

        <SeasonRating league={league} season={season} label={`${leagueName} ${season} season`} />
        <SeasonFanLists label={`${leagueName} ${season} season`} altLabel={`${season} ${leagueName} season`} />

        <nav className="mt-8 border-b border-zinc-800 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {jump.map((j) => <Link key={j.id} href={tab(j.id)} className={sel === j.id ? "text-accent" : "text-zinc-300 hover:text-accent"} style={display}>{j.label}</Link>)}
            {hasPost && <Link href={tab("postseason")} className={sel === "postseason" ? "text-accent" : "text-zinc-300 hover:text-accent"} style={display}>Postseason</Link>}
          </div>
        </nav>

        {sel !== "postseason" && current && (
          <Section title={current[0]} count={current[1].length}>
            {current[1].map((g) => <GameRow key={g.id} g={g} />)}
          </Section>
        )}

        {sel === "postseason" && hasPost && (
          <div className="mt-10 border-t-2 border-accent pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Postseason</div>
            {nflPost.map(([label, gs]) => {
              const isFinal = label === "Super Bowl" || label === "Championship";
              return (
                <Section key={label} title={label} count={gs.length} accent={isFinal}>
                  {gs.map((g) => <GameRow key={g.id} g={g} final={isFinal} />)}
                </Section>
              );
            })}
            {playoffSeries.map((s) => (
              <Section key={s.label} title={s.label} count={s.games.length}>
                {s.games.map((g) => <GameRow key={g.id} g={g} />)}
              </Section>
            ))}
            {finalsGroup && (
              <Section title={`${finalTitle} — ${finalsGroup.label}`} count={finalsGroup.games.length} accent>
                {finalsGroup.games.map((g) => <GameRow key={g.id} g={g} final />)}
              </Section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}