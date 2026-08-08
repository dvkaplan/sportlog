"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SeasonFanLists({ label, altLabel }: { label: string; altLabel: string }) {
  const [hits, setHits] = useState<{ list_id: string; position: number; title: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("list_items")
        .select("list_id, position, label, lists!inner(id, title, is_public)")
        .eq("lists.is_public", true)
        .or(`label.ilike.%${label}%,label.ilike.%${altLabel}%`);
      setHits(
        (data ?? []).map((r) => {
          const l = r.lists as unknown as { id: string; title: string };
          return { list_id: l.id, position: r.position, title: l.title };
        })
      );
    })();
  }, [label, altLabel]);
  if (hits.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="font-semibold">Fan lists featuring this season</h2>
      <div className="mt-3 space-y-2">
        {hits.map((h, i) => (
          <Link key={i} href={`/lists/${h.list_id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm transition hover:border-emerald-400">
            <span>{h.title}</span>
            <span className="text-emerald-400">#{h.position}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}