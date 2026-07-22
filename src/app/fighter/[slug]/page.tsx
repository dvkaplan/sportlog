"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getFighter, GAMES } from "@/lib/data-fighters-bridge";
import { TITLES, REIGNING } from "@/lib/fighter-extras";
import media from "@/lib/fighter-media.json";
import rosterRecords from "@/lib/roster-records.json";
import histories from "@/lib/fight-histories.json";
import { supabase } from "@/lib/supabase";
import FollowButton from "@/components/FollowButton";
import BackLink from "@/components/BackLink";
import { useRouter } from "next/navigation";
import { ALL_FIGHTERS } from "@/lib/all-fighters";

type Media = Record<string, { idPlayer: string | null; photo: string | null; bio: string | null }>;
type Fight = { result: string; record: string; opponent: string; method: string; event: string; date: string };
const MEDIA = media as Media;
const REC = rosterRecords as Record<string, string>;
const HIST = histories as Record<string, Fight[]>;
const slugifyName = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dateSlug = (d: string) => slugifyName(d).slice(0, 24) || "nd";
const NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  ALL_FIGHTERS.map((f) => [f.name.toLowerCase(), f.slug])
);

export default function FighterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const fighter = getFighter(slug);
  const [fanLists, setFanLists] = useState<{ list_id: string; position: number; title: string }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showAllFights, setShowAllFights] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!fighter) return;
    supabase.rpc("bump_click", { t: "fighter", i: fighter.slug }).then(({ error }) => {
      if (error) console.error("bump_click failed:", error.message);
    });
  }, [fighter]);

  useEffect(() => {
    if (!fighter) return;
    (async () => {
      const { data } = await supabase
        .from("list_items")
        .select("list_id, position, lists!inner(id, title, is_public)")
        .eq("lists.is_public", true)
        .ilike("label", `%${fighter.name}%`);
      setFanLists(
        (data ?? []).map((r) => {
          const l = r.lists as unknown as { id: string; title: string };
          return { list_id: l.id, position: r.position, title: l.title };
        })
      );
    })();
  }, [fighter]);

  if (!fighter) return <main className="p-10 text-zinc-100">Fighter not found.</main>;

  const m = MEDIA[fighter.slug] ?? { photo: null, bio: null, idPlayer: null };
  const titles = TITLES[fighter.slug];
  const record = REC[fighter.slug] ?? fighter.record;
  const reigning = REIGNING.has(fighter.slug);
  const bio = m.bio ?? "";
  const fights = HIST[fighter.slug] ?? [];
  const shownFights = showAllFights ? fights : fights.slice(0, 10);
  const lastName = fighter.name.split(" ").slice(-1)[0].toLowerCase();
  const iconicFights = GAMES.filter(
    (g) => (g.sportSlug === "boxing" || g.sportSlug === "mma") && g.title.toLowerCase().includes(lastName)
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink fallback="/search" />
        <div className="mt-6 flex items-start gap-6">
          {m.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.photo} alt={fighter.name} className="h-32 w-32 shrink-0 rounded-xl object-cover object-top" />
          ) : (
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-4xl">
              {fighter.sport === "boxing" ? "🥊" : "🥋"}
            </div>
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              {fighter.sport === "boxing" ? "🥊 Boxing" : "🥋 MMA"} · {fighter.era}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-bold">{fighter.name}</h1>
              <FollowButton entityType="fighter" entityId={fighter.slug} entityName={fighter.name} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {fighter.division}
              {record ? ` · ${record}` : ""}
              {reigning ? " · 🏆 Reigning Champion" : ""}
            </p>
            {titles && <p className="mt-2 text-sm font-medium text-amber-300">{titles}</p>}
          </div>
        </div>

        <p className="mt-6 leading-relaxed text-zinc-300">{fighter.blurb}</p>

        {bio && (
          <div className="mt-4">
            <p className={`text-sm leading-relaxed text-zinc-400 ${expanded ? "" : "line-clamp-5"}`}>{bio}</p>
            {bio.length > 350 && (
              <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm text-emerald-400 hover:underline">
                {expanded ? "Show less" : "Read more…"}
              </button>
            )}
          </div>
        )}
        {(bio || fights.length > 0) && (
          <p className="mt-1 text-xs text-zinc-600">
            Bio, photo & fight record via{" "}
            <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(fighter.name)}`} className="underline hover:text-zinc-400" target="_blank" rel="noreferrer">Wikipedia</a>, CC BY-SA
          </p>
        )}

        {fights.length > 0 && (
          <>
            <h2 className="mt-10 font-semibold">Fight record</h2>
            <div className="mt-3 space-y-1.5">
              {shownFights.map((f, i) => (
                <div
                  key={i}
                  onClick={() =>
                    router.push(
                      `/game/fight-${[slugifyName(fighter.name), slugifyName(f.opponent)].sort().join("-vs-")}-${dateSlug(f.date)}`
                    )
                  }
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm transition hover:border-emerald-400"
                >
                  <span className={`w-8 shrink-0 text-center font-bold ${f.result === "W" ? "text-emerald-400" : f.result === "L" ? "text-red-400" : "text-zinc-400"}`}>{f.result}</span>
                  <span className="w-14 shrink-0 text-xs text-zinc-500">{f.record}</span>
                  {NAME_TO_SLUG[f.opponent.toLowerCase()] ? (
                    <Link
                      href={`/fighter/${NAME_TO_SLUG[f.opponent.toLowerCase()]}`}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 truncate font-medium text-zinc-100 underline-offset-4 hover:text-emerald-400 hover:underline"
                    >
                      {f.opponent}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium">{f.opponent}</span>
                  )}
                  <span className="hidden max-w-[30%] truncate text-xs text-zinc-500 sm:block">{f.method}</span>
                  <span className="hidden shrink-0 text-xs text-zinc-600 md:block">{f.date}</span>
                </div>
              ))}
            </div>
            {fights.length > 10 && (
              <button
                onClick={() => setShowAllFights(!showAllFights)}
                className="mt-3 rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:border-emerald-400"
              >
                {showAllFights ? "Show less" : `Show full record (${fights.length} fights)`}
              </button>
            )}
          </>
        )}

        {iconicFights.length > 0 && (
          <>
            <h2 className="mt-10 font-semibold">Iconic fights on SPORTLOG</h2>
            <div className="mt-3 space-y-2">
              {iconicFights.map((g) => (
                <Link key={g.id} href={`/game/${g.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-emerald-400">
                  <div className="font-medium">{g.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">{g.date} {g.score ? `· ${g.score}` : ""}</div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold">Fan lists featuring {fighter.name.split(" ").slice(-1)[0]}</h2>
          {fanLists.length > 0 ? (
            <div className="mt-3 space-y-2">
              {fanLists.map((h, i) => (
                <Link key={i} href={`/lists/${h.list_id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm transition hover:border-emerald-400">
                  <span>{h.title}</span>
                  <span className="text-emerald-400">#{h.position}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              Not ranked in any fan list yet.{" "}
              <Link href="/lists/new" className="text-emerald-400 hover:underline">Start one</Link> — type the full name so it links here.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}