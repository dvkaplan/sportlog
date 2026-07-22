"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getFighter, GAMES } from "@/lib/data-fighters-bridge";
import { supabase } from "@/lib/supabase";
import FollowButton from "@/components/FollowButton";
import BackLink from "@/components/BackLink";

export default function FighterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const fighter = getFighter(slug);
  const [fanLists, setFanLists] = useState<{ list_id: string; position: number; title: string }[]>([]);

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

  const lastName = fighter.name.split(" ").slice(-1)[0].toLowerCase();
  const iconicFights = GAMES.filter(
    (g) => (g.sportSlug === "boxing" || g.sportSlug === "mma") && g.title.toLowerCase().includes(lastName)
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink fallback="/search" />
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {fighter.sport === "boxing" ? "🥊 Boxing" : "🥋 MMA"} · {fighter.era}
          </div>
          <div className="mt-1 flex items-center gap-4">
            <h1 className="text-3xl font-bold">{fighter.name}</h1>
            <FollowButton entityType="fighter" entityId={fighter.slug} entityName={fighter.name} />
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {fighter.division}
            {fighter.record ? ` · ${fighter.record}` : ""}
            {fighter.champion ? " · 🏆 Champion" : ""}
          </p>
          <p className="mt-4 leading-relaxed text-zinc-300">{fighter.blurb}</p>
        </div>

        {iconicFights.length > 0 && (
          <>
            <h2 className="mt-10 font-semibold">Iconic fights on SPORTLOG</h2>
            <div className="mt-3 space-y-2">
              {iconicFights.map((g) => (
                <Link
                  key={g.id}
                  href={`/game/${g.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-emerald-400"
                >
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
                <Link
                  key={i}
                  href={`/lists/${h.list_id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm transition hover:border-emerald-400"
                >
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