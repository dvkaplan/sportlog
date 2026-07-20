"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SPORTS } from "@/lib/data";

type ListRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  sport_slug: string | null;
  created_at: string;
};

export default function ListsPage() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("lists")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);
      setLists(rows ?? []);
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p) => (map[p.id] = p.username));
        setNames(map);
      }
      setLoaded(true);
    })();
  }, []);

  function sportName(slug: string | null) {
    if (!slug) return "General";
    return SPORTS.find((s) => s.slug === slug)?.name ?? slug;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Lists</h1>
          <Link
            href="/lists/new"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            + New list
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Ranked takes from the community. Teams, eras, fights, anything.
        </p>
        <div className="mt-8 space-y-3">
          {lists.map((l) => (
            <Link
              key={l.id}
              href={`/lists/${l.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-emerald-400"
            >
              <div className="font-semibold">{l.title}</div>
              {l.description && (
                <div className="mt-1 text-sm text-zinc-400">{l.description}</div>
              )}
              <div className="mt-2 text-xs text-zinc-500">
                {sportName(l.sport_slug)} · by{" "}
                {names[l.user_id] ? `@${names[l.user_id]}` : "a fan"} ·{" "}
                {new Date(l.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
          {loaded && lists.length === 0 && (
            <p className="text-sm text-zinc-500">No lists yet. Be the first.</p>
          )}
        </div>
      </div>
    </main>
  );
}