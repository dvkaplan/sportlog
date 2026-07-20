"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getGame } from "@/lib/data";

type RatingRow = { game_id: string; rating: number; review: string | null; updated_at: string };
type ListRow = { id: string; title: string; is_public: boolean; created_at: string };

export default function ProfilePage() {
  const [username, setUsername] = useState<string | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setSignedOut(true);
        return;
      }
      const { data: prof } = await supabase
        .from("profiles").select("username").eq("id", uid).maybeSingle();
      setUsername(prof?.username ?? null);

      const { data: rs } = await supabase
        .from("ratings")
        .select("game_id, rating, review, updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      setRatings(rs ?? []);

      const { data: ls } = await supabase
        .from("lists")
        .select("id, title, is_public, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setLists(ls ?? []);
    })();
  }, []);

  if (signedOut)
    return (
      <main className="p-10 text-zinc-100">
        <Link href="/auth" className="text-emerald-400">Sign in</Link> to see your profile.
      </main>
    );

  const avg =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold">{username ? `@${username}` : "Your profile"}</h1>
        <div className="mt-4 flex gap-6 text-sm text-zinc-400">
          <span><span className="font-bold text-emerald-400">{ratings.length}</span> rated</span>
          <span><span className="font-bold text-emerald-400">{lists.length}</span> lists</span>
          {avg && <span>avg score <span className="font-bold text-emerald-400">{avg.toFixed(1)}</span></span>}
        </div>

        <h2 className="mt-10 font-semibold">Your ratings</h2>
        <div className="mt-3 space-y-2">
          {ratings.map((r) => {
            const g = getGame(r.game_id);
            return (
              <Link
                key={r.game_id}
                href={`/game/${r.game_id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-emerald-400"
              >
                <div>
                  <div className="font-medium">{g?.title ?? r.game_id}</div>
                  {r.review && <div className="mt-1 line-clamp-1 text-sm text-zinc-400">{r.review}</div>}
                </div>
                <span className="ml-4 shrink-0 text-xl font-bold text-emerald-400">
                  {Number(r.rating).toFixed(1)}
                </span>
              </Link>
            );
          })}
          {ratings.length === 0 && <p className="text-sm text-zinc-500">Nothing rated yet.</p>}
        </div>

        <h2 className="mt-10 font-semibold">Your lists</h2>
        <div className="mt-3 space-y-2">
          {lists.map((l) => (
            <Link
              key={l.id}
              href={`/lists/${l.id}`}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-emerald-400"
            >
              <span className="font-medium">{l.title}</span>
              <span className="text-xs text-zinc-500">{l.is_public ? "Public" : "🔒 Private"}</span>
            </Link>
          ))}
          {lists.length === 0 && <p className="text-sm text-zinc-500">No lists yet.</p>}
        </div>
      </div>
    </main>
  );
}