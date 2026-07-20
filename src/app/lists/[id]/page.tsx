"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ListRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  sport_slug: string | null;
  created_at: string;
};
type ItemRow = { id: string; position: number; label: string; note: string | null };

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [list, setList] = useState<ListRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [author, setAuthor] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    setMe(userData.user?.id ?? null);

    const { data: l } = await supabase.from("lists").select("*").eq("id", id).maybeSingle();
    if (!l) {
      setMissing(true);
      return;
    }
    setList(l);

    const { data: its } = await supabase
      .from("list_items")
      .select("id, position, label, note")
      .eq("list_id", id)
      .order("position");
    setItems(its ?? []);

    const { data: prof } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", l.user_id)
      .maybeSingle();
    setAuthor(prof?.username ?? null);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    if (!confirm("Delete this list? This can't be undone.")) return;
    const { error } = await supabase.from("lists").delete().eq("id", id);
    if (!error) router.push("/lists");
  }

  if (missing)
    return (
      <main className="p-10 text-zinc-100">
        List not found. <Link href="/lists" className="text-emerald-400">← All lists</Link>
      </main>
    );
  if (!list) return <main className="p-10 text-zinc-100">Loading…</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/lists" className="text-sm text-zinc-400 hover:text-emerald-400">← All lists</Link>
        <h1 className="mt-4 text-2xl font-bold">{list.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          by {author ? `@${author}` : "a fan"} ·{" "}
          {new Date(list.created_at).toLocaleDateString()}
        </p>
        {list.description && <p className="mt-3 text-zinc-300">{list.description}</p>}

        <div className="mt-8 space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <span className="w-8 shrink-0 text-right text-xl font-bold text-emerald-400">
                {it.position}
              </span>
              <span className="font-medium">{it.label}</span>
            </div>
          ))}
        </div>

        {me === list.user_id && (
          <button
            onClick={remove}
            className="mt-8 rounded border border-zinc-700 px-4 py-2 text-sm text-red-400 hover:border-red-400"
          >
            Delete list
          </button>
        )}
      </div>
    </main>
  );
}