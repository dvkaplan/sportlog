"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getEra, getSport } from "@/lib/data";
import { supabase } from "@/lib/supabase";

type ListHit = { list_id: string; position: number; title: string };

export default function EraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const era = getEra(slug);
  const [hits, setHits] = useState<ListHit[]>([]);

  useEffect(() => {
    if (!era) return;
    (async () => {
      const { data } = await supabase
        .from("list_items")
        .select("list_id, position, label, lists!inner(id, title, is_public)")
        .eq("lists.is_public", true)
        .ilike("label", `%${era.name}%`);
      const rows =
        (data ?? []).map((r) => {
          const l = r.lists as unknown as { id: string; title: string };
          return { list_id: l.id, position: r.position, title: l.title };
        }) ?? [];
      setHits(rows);
    })();
  }, [era]);

  if (!era) return <main className="p-10 text-zinc-100">Era not found.</main>;
  const sport = getSport(era.sportSlug);
  const avg = hits.length > 0 ? hits.reduce((s, h) => s + h.position, 0) / hits.length : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href={`/sport/${era.sportSlug}`} className="text-sm text-zinc-400 hover:text-emerald-400">
          ← {sport?.name ?? "Sport"}
        </Link>
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {sport?.emoji} {era.years}
          </div>
          <h1 className="mt-1 text-3xl font-bold">{era.name}</h1>
          <p className="mt-4 leading-relaxed text-zinc-300">{era.blurb}</p>
        </div>

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold">Fan verdict</h2>
          {hits.length > 0 ? (
            <p className="mt-2 text-sm text-zinc-400">
              Ranked in <span className="font-bold text-emerald-400">{hits.length}</span> fan list
              {hits.length === 1 ? "" : "s"} · average position{" "}
              <span className="font-bold text-emerald-400">#{avg?.toFixed(1)}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              No fan lists rank this era yet. Be the first —{" "}
              <Link href="/lists/new" className="text-emerald-400 hover:underline">
                make a list
              </Link>{" "}
              and include &quot;{era.name}&quot; as an entry.
            </p>
          )}
          {hits.length > 0 && (
            <div className="mt-4 space-y-2">
              {hits.map((h, i) => (
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
          )}
        </div>
      </div>
    </main>
  );
}