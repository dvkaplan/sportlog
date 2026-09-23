import Link from "next/link";
import eventsData from "@/lib/events.json";
import BackLink from "@/components/BackLink";
import { promotionOf } from "@/lib/popular";

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
type EventRec = { slug: string; name: string; date: string; fights: { gameId: string }[] };
const iso = (d: string) => { const t = Date.parse(d ?? ""); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ year?: string; promo?: string }> }) {
  const { year, promo } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const all = (eventsData as EventRec[])
    .map((e) => ({ ...e, iso: iso(e.date), promo: promotionOf(e.name) }))
    .filter((e) => e.iso && e.iso <= today)
    .sort((a, b) => b.iso.localeCompare(a.iso));
  const years = [...new Set(all.map((e) => e.iso.slice(0, 4)))];
  const promos = [...new Set(all.map((e) => e.promo))].sort((a, b) => (a === "UFC" ? -1 : b === "UFC" ? 1 : a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  const y = year && years.includes(year) ? year : null; // null = all years
  const list = all.filter((e) => (!y || e.iso.startsWith(y)) && (!promo || e.promo === promo));
    const CAP = 150;
  const capped = !y && list.length > CAP;
  const shown = capped ? list.slice(0, CAP) : list;
  const q = (yy: string | null, pp?: string | null) => `/events${yy || pp ? "?" : ""}${yy ? `year=${yy}` : ""}${yy && pp ? "&" : ""}${pp ? `promo=${encodeURIComponent(pp)}` : ""}`;
  const active = "text-accent", idle = "text-zinc-100 hover:text-accent";

  // group by year when showing all years, so long lists stay scannable
  const groups: [string, typeof list][] = y ? [[y, shown]] : years.map((yy) => [yy, shown.filter((e) => e.iso.startsWith(yy))] as [string, typeof list]).filter(([, g]) => g.length > 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <BackLink fallback="/sport/mma" />
        <header className="mt-6 border-b border-zinc-700 pb-6">
          <h1 className="text-5xl leading-none tracking-tight sm:text-6xl" style={display}>Every Event</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-100">{all.length.toLocaleString()} events · {years[years.length - 1]}–{years[0]}</p>
        </header>

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-b border-zinc-800 pb-3 text-xs uppercase tracking-[0.15em]">
          <Link href={q(y)} className={!promo ? active : idle}>All</Link>
          {promos.map((p) => <Link key={p} href={q(y, p)} className={promo === p ? active : idle}>{p}</Link>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href={q(null, promo)} className={!y ? active : idle} style={display}>All Years</Link>
          {years.map((yy) => <Link key={yy} href={q(yy, promo)} className={yy === y ? active : idle} style={display}>{yy}</Link>)}
        </div>

        {groups.map(([yy, g]) => (
          <section key={yy} className="mt-8">
            {!y && <h2 className="border-b border-zinc-700 pb-2 text-2xl leading-none text-zinc-100" style={display}>{yy}</h2>}
            <ol>
              {g.map((e) => (
                <li key={e.slug} className="border-b border-zinc-800">
                  <Link href={`/event/${e.slug}`} className="group flex items-center gap-5 py-4 transition hover:bg-zinc-900">
                    <span className="w-24 shrink-0 text-xs uppercase tracking-[0.12em] text-zinc-300">{e.iso}</span>
                    <span className="min-w-0 flex-1 truncate text-lg font-medium leading-tight group-hover:text-accent">{e.name}</span>
                    <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-zinc-300">{e.fights.length} fights</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
                {capped && (
          <p className="mt-8 border-t border-zinc-800 pt-4 text-xs uppercase tracking-[0.15em] text-zinc-300">
            Showing the latest {CAP} of {list.length.toLocaleString()} events
          </p>
        )}
        {list.length === 0 && <p className="py-8 text-sm text-zinc-400">No events for that filter.</p>}
      </div>
    </main>
  );
}