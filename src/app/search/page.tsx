"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cleanTeamLabel, labelPosition } from "@/lib/labels";

type Team = { idTeam: string; strTeam: string; strLeague: string | null; strSport: string | null; strBadge: string | null };
type Player = { idPlayer: string; strPlayer: string; strTeam: string; strLeague: string | null; strPosition: string | null; strSport: string | null; strThumb: string | null };
type Fighter = { slug: string; name: string; sport: string; division: string; era: string; champion?: boolean; photo?: string | null };
type EventHit = { slug: string; name: string; date: string; count: number };
type FightHit = { id: string; title: string; date: string; score: string; event: string; sportSlug: string };
type CoachHit = { kind: "coach" | "tsdb"; slug: string | null; idPlayer: string | null; name: string; role: string | null; team: string | null; sport: string | null; photo: string | null };
type SeasonHit = { league: string; leagueName: string; season: string; label: string };
type GameHit = { id: string; title: string; league: string; date: string; score: string; round: string };
type Results = { teams: Team[]; players: Player[]; fighters: Fighter[]; coaches: CoachHit[]; events: EventHit[]; fights: FightHit[]; seasons: SeasonHit[] };

const EMPTY: Results = { teams: [], players: [], fighters: [], coaches: [], events: [], fights: [], seasons: [] };
const TABS = ["games", "teams", "players", "fighters", "coaches", "fights", "events", "seasons"] as const;
type Tab = "all" | (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { all: "All", games: "Games", teams: "Teams", players: "Players", fighters: "Fighters", coaches: "Coaches", fights: "Fights", events: "Events", seasons: "Seasons" };
const PREVIEW = 4; // rows per section on the All tab

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const join = (parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(", ");
const gameDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

function Row({ href, img, contain, title, tag, meta, right }: {
  href: string; img?: string | null; contain?: boolean; title: string; tag?: string; meta?: string; right?: string;
}) {
  return (
    <li className="border-b border-zinc-800">
      <Link href={href} className="group flex items-center gap-4 py-3 transition hover:bg-zinc-900">
        {img !== undefined && (img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className={`h-9 w-9 shrink-0 ${contain ? "object-contain" : "object-cover object-top"}`} />
        ) : (
          <span className="h-9 w-9 shrink-0 bg-zinc-900" />
        ))}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium leading-tight group-hover:text-accent">
            {title}
            {tag ? <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">{tag}</span> : null}
          </span>
          {meta ? <span className="mt-1 block truncate text-[11px] uppercase tracking-[0.12em] text-zinc-300">{meta}</span> : null}
        </span>
        {right ? <span className="shrink-0 text-xl leading-none text-zinc-100" style={display}>{right}</span> : null}
      </Link>
    </li>
  );
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [res, setRes] = useState<Results>(EMPTY);
  const [games, setGames] = useState<GameHit[]>([]);
  const [teamOnly, setTeamOnly] = useState(false); // the search is a single team name, so offer the game-search tip
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const run = useRef(0);

  // Pick the search back up from the address bar, so Back from a result returns to the same results.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("t") as Tab | null;
    setQ(p.get("q") ?? "");
    if (t && (t === "all" || (TABS as readonly string[]).includes(t))) setTab(t);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q);
    if (tab !== "all") p.set("t", tab);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");
  }, [q, tab, ready]);

  useEffect(() => {
    const text = q.trim();
    const mine = ++run.current;
    if (text.length < 2) {
      setRes(EMPTY); setGames([]); setTeamOnly(false); setBusy(false);
      return;
    }
    const timer = setTimeout(async () => {
      setBusy(true);
      // Games are looked up separately so a slow game lookup never holds up everything else.
      fetch(`/api/game-search?limit=40&q=${encodeURIComponent(text)}`).then((r) => r.json())
        .then((d) => { if (run.current === mine) { setGames(d?.games ?? []); setTeamOnly(d?.hint === "team"); } })
        .catch(() => { if (run.current === mine) { setGames([]); setTeamOnly(false); } });
      try {
        const d = await fetch(`/api/sportsdb?mode=findteams&q=${encodeURIComponent(text)}`).then((r) => r.json());
        if (run.current !== mine) return;
        let players: Player[] = d?.players ?? [];
        const ids = players.map((p) => p.idPlayer);
        if (ids.length > 0) {
          const { data: clicks } = await supabase.from("entity_clicks").select("entity_id, clicks").eq("entity_type", "player").in("entity_id", ids);
          const map: Record<string, number> = {};
          (clicks ?? []).forEach((c) => (map[c.entity_id] = Number(c.clicks)));
          players = [...players].sort((a, b) => (map[b.idPlayer] ?? 0) - (map[a.idPlayer] ?? 0));
        }
        if (run.current !== mine) return;
        setRes({ teams: d?.teams ?? [], players, fighters: d?.fighters ?? [], coaches: d?.coaches ?? [], events: d?.events ?? [], fights: d?.fights ?? [], seasons: d?.seasons ?? [] });
      } catch {
        if (run.current === mine) setRes(EMPTY);
      }
      if (run.current === mine) setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const rows: Record<(typeof TABS)[number], React.ReactNode[]> = {
    games: games.map((g) => <Row key={g.id} href={`/game/${g.id}`} title={g.title} meta={join([g.league, gameDate(g.date), g.round])} right={g.score} />),
    teams: res.teams.map((t) => <Row key={t.idTeam} href={`/team/${t.idTeam}`} img={t.strBadge} contain title={t.strTeam} meta={join([t.strSport, t.strLeague])} />),
    players: res.players.map((p) => <Row key={p.idPlayer} href={`/player/${p.idPlayer}`} img={p.strThumb} title={p.strPlayer} meta={join([cleanTeamLabel(p.strTeam), labelPosition(p.strPosition, p.strSport), cleanTeamLabel(p.strLeague ?? "")])} />),
    fighters: res.fighters.map((f) => <Row key={f.slug} href={`/fighter/${f.slug}`} img={f.photo ?? null} title={f.name} tag={f.champion ? "Champion" : undefined} meta={join([f.division, f.era])} />),
    coaches: res.coaches.map((c, i) => <Row key={`${c.slug ?? c.idPlayer}-${i}`} href={c.idPlayer ? `/player/${c.idPlayer}` : `/coach/${c.slug}`} img={c.photo} title={c.name} meta={join([labelPosition(c.role, c.sport), c.team])} />),
    fights: res.fights.map((f) => <Row key={f.id} href={`/game/${f.id}`} title={f.title} meta={join([f.event, f.date, f.score])} />),
    events: res.events.map((e) => <Row key={e.slug} href={`/event/${e.slug}`} title={e.name} meta={join([e.date, `${e.count} fight${e.count === 1 ? "" : "s"}`])} />),
    seasons: res.seasons.map((s) => <Row key={`${s.league}-${s.season}`} href={`/seasons/${s.league}/${s.season}`} title={s.label} />),
  };
  const present = TABS.filter((t) => rows[t].length > 0);
  const total = present.reduce((n, t) => n + rows[t].length, 0);
  const active: Tab = tab !== "all" && rows[tab].length === 0 ? "all" : tab;
  const typed = q.trim().length >= 2;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <h1 className="text-5xl leading-none tracking-tight" style={display}>Search</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="LeBron James, Lakers Celtics 1987, UFC 229…"
          className="mt-8 w-full border-0 border-b border-zinc-700 bg-transparent pb-3 text-2xl text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-accent"
        />
        {!typed && (
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            Search teams, players, coaches, fighters, fights, events and seasons. To find a game, type two teams, or a team and a year:{" "}
            <span className="text-zinc-100">bulls jazz 1998</span>, <span className="text-zinc-100">patriots 2007</span>, <span className="text-zinc-100">super bowl 2015</span>.
          </p>
        )}

        {typed && present.length > 0 && (
          <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-700 pb-3 text-xs uppercase tracking-[0.15em]">
            {(["all", ...present] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`pb-0.5 transition hover:text-accent ${active === t ? "border-b border-accent text-accent" : "text-zinc-100"}`}>
                {TAB_LABEL[t]} <span className={active === t ? "text-accent" : "text-zinc-400"}>{t === "all" ? total : rows[t].length}</span>
              </button>
            ))}
          </nav>
        )}

        {typed && present.filter((t) => active === "all" || active === t).map((t) => {
          const list = active === "all" ? rows[t].slice(0, PREVIEW) : rows[t];
          const more = rows[t].length - list.length;
          return (
            <section key={t} className="mt-8">
              <h2 className="flex items-baseline justify-between border-b border-zinc-700 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-100">{TAB_LABEL[t]}</span>
                {more > 0 && (
                  <button type="button" onClick={() => { setTab(t); window.scrollTo({ top: 0 }); }} className="text-[11px] uppercase tracking-[0.15em] text-zinc-300 transition hover:text-accent">
                    See all {rows[t].length}
                  </button>
                )}
              </h2>
              <ol>{list}</ol>
            </section>
          );
        })}

        {typed && teamOnly && present.length > 0 && (
          <p className="mt-8 text-sm text-zinc-300">
            Looking for a game? Add a second team or a year, like <span className="text-zinc-100">{q.trim().toLowerCase()} 2010</span>.
          </p>
        )}

        {typed && busy && present.length === 0 && <p className="mt-8 text-xs uppercase tracking-[0.15em] text-zinc-300">Searching…</p>}
        {typed && !busy && present.length === 0 && (
          <p className="mt-8 text-sm text-zinc-300">
            Nothing found for &ldquo;{q.trim()}&rdquo;. To find a game, try two teams or a team and a year, like <span className="text-zinc-100">bulls jazz 1998</span>.
          </p>
        )}
      </div>
    </main>
  );
}