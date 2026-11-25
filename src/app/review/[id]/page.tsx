import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getGame } from "@/lib/data";
import { getEvent } from "@/lib/events";
import { ALL_FIGHTERS } from "@/lib/all-fighters";
import BackLink from "@/components/BackLink";
import { ReviewThread, type ReviewKind } from "@/components/Reviews";
import playersData from "@/lib/players.json";
import teamsData from "@/lib/teams.json";
import coachUniverseData from "@/lib/coach-universe.json";
import coachMediaData from "@/lib/coach-media.json";
import nbaMissing from "@/lib/nba-missing-players.json";
import nflMissing from "@/lib/nfl-missing-players.json";
import mlbMissing from "@/lib/mlb-missing-players.json";
import nhlMissing from "@/lib/nhl-missing-players.json";
import soccerUniv from "@/lib/soccer-player-ids.json";

export const dynamic = "force-dynamic"; // always show the latest review text

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const LG: Record<string, string> = { nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1" };
const CROSS_YEAR = ["nba", "nhl", "epl", "laliga", "seriea", "bundesliga", "ligue1"];
const longDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};
const postedDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
};

// What the review is about: a title, a link back to it, and a short line of context.
type Subject = { title: string; href: string | null; meta: string };

async function gameSubject(gameId: string): Promise<Subject> {
  const season = gameId.match(/^season-([a-z0-9]+)-(.+)$/);
  if (season) return { title: `${season[2]} ${LG[season[1]] ?? season[1].toUpperCase()} Season`, href: `/seasons/${season[1]}/${season[2]}`, meta: "Season" };

  if (gameId.startsWith("event-")) {
    const slug = gameId.slice(6);
    const ev = getEvent(slug);
    return { title: ev?.name ?? slug, href: `/event/${slug}`, meta: ev?.date ? `Event, ${ev.date}` : "Event" };
  }

  const hm = gameId.match(/^(nfl|nba|nhl|mlb|epl|laliga|seriea|bundesliga|ligue1)-(\d{4})/);
  if (hm) {
    const lg = hm[1], yr = Number(hm[2]);
    const candidates = CROSS_YEAR.includes(lg)
      ? [`${yr - 1}-${String(yr % 100).padStart(2, "0")}`, `${yr}-${String((yr + 1) % 100).padStart(2, "0")}`]
      : [String(yr)];
    for (const s of candidates) {
      try {
        const games = JSON.parse(await readFile(path.join(process.cwd(), "src", "lib", "seasons", lg, `${s}.json`), "utf8")) as { id: string; away: string; home: string; date: string }[];
        const g = games.find((x) => x.id === gameId);
        if (g) return { title: `${g.away} at ${g.home}`, href: `/game/${gameId}`, meta: `${LG[lg]}, ${longDate(g.date)}` };
      } catch { /* try the other season */ }
    }
    return { title: `${LG[lg]} game`, href: `/game/${gameId}`, meta: LG[lg] };
  }

  const g = getGame(gameId);
  if (g) return { title: g.title, href: `/game/${gameId}`, meta: [g.league, g.date].filter(Boolean).join(", ") };
  return { title: "Game", href: `/game/${gameId}`, meta: "" };
}

function entitySubject(type: string, id: string): Subject {
  if (type === "player") {
    const p = (playersData as { idPlayer: string; strPlayer: string; strLeague: string | null }[]).find((x) => x.idPlayer === id);
    if (p) return { title: p.strPlayer, href: `/player/${id}`, meta: ["Player", p.strLeague].filter(Boolean).join(", ") };
    const gen: Record<string, { key: string; list: unknown; league: string }> = {
      nba: { key: "nbaId", list: nbaMissing, league: "NBA" }, nfl: { key: "nflId", list: nflMissing, league: "NFL" },
      mlb: { key: "mlbId", list: mlbMissing, league: "MLB" }, nhl: { key: "nhlId", list: nhlMissing, league: "NHL" },
    };
    const m = id.match(/^(nba|nfl|mlb|nhl)-(.+)$/);
    if (m && gen[m[1]]) {
      const hit = (gen[m[1]].list as Record<string, string>[]).find((x) => x[gen[m[1]].key] === m[2]);
      if (hit) return { title: hit.name, href: `/player/${id}`, meta: `Player, ${gen[m[1]].league}` };
    }
    if (id.startsWith("soc-")) {
      const nm = (soccerUniv as { names: Record<string, string> }).names[id.slice(4)];
      if (nm) return { title: nm, href: `/player/${id}`, meta: "Player, Soccer" };
    }
    return { title: "Player", href: `/player/${id}`, meta: "Player" };
  }
  if (type === "coach") {
    const cu = (coachUniverseData as Record<string, { name: string; leagues: string[] }>)[id];
    const cm = (coachMediaData as Record<string, { name: string }>)[id];
    return { title: cu?.name ?? cm?.name ?? "Coach", href: `/coach/${id}`, meta: ["Coach", ...(cu?.leagues ?? [])].join(", ") };
  }
  if (type === "team") {
    const t = (teamsData as { idTeam: string; strTeam: string; strLeague: string | null }[]).find((x) => x.idTeam === id);
    return { title: t?.strTeam ?? "Team", href: `/team/${id}`, meta: ["Team", t?.strLeague].filter(Boolean).join(", ") };
  }
  if (type === "fighter") {
    const f = ALL_FIGHTERS.find((x) => x.slug === id);
    return { title: f?.name ?? "Fighter", href: `/fighter/${id}`, meta: ["Fighter", f?.division].filter(Boolean).join(", ") };
  }
  return { title: id, href: null, meta: type };
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const m = decodeURIComponent(raw).match(/^(g|e)-([A-Za-z0-9-]{1,64})$/);
  if (!m) notFound();
  const kind: ReviewKind = m[1] === "g" ? "game" : "entity";
  const reviewId = m[2];

  const { data: row } = await supabaseAdmin.from(kind === "game" ? "ratings" : "entity_ratings").select("*").eq("id", reviewId).maybeSingle();
  if (!row) notFound();

  const subject = kind === "game" ? await gameSubject(String(row.game_id)) : entitySubject(String(row.entity_type), String(row.entity_id));
  const { data: prof } = await supabaseAdmin.from("profiles").select("username").eq("id", row.user_id).maybeSingle();
  const author = prof?.username ?? `Fan-${String(row.user_id).slice(0, 4)}`;
  const text = String(row.review ?? "").trim();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-10">
        <BackLink fallback={subject.href ?? "/"} />

        <header className="mt-6 border-b border-zinc-700 pb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-100">Review</div>
          <h1 className="mt-3 text-4xl leading-tight tracking-tight sm:text-5xl" style={display}>
            {subject.href ? <Link href={subject.href} className="transition hover:text-accent">{subject.title}</Link> : subject.title}
          </h1>
          {subject.meta && <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-300">{subject.meta}</p>}
        </header>

        <div className="mt-6 flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-[0.12em] text-zinc-300">
            <span className="text-zinc-100">@{author}</span>
            <span className="ml-4 text-zinc-500">{postedDate(String(row.updated_at))}</span>
          </div>
          <span className="text-5xl leading-none text-accent" style={display}>{Number(row.rating).toFixed(1)}</span>
        </div>

        {text
          ? <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-zinc-100">{text}</p>
          : <p className="mt-5 text-sm text-zinc-400">Rated without a written review.</p>}

        <ReviewThread kind={kind} reviewId={String(row.id)} />
      </div>
    </main>
  );
}