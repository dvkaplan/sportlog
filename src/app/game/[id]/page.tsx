"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getGame } from "@/lib/data";
import { supabase } from "@/lib/supabase";

type RatingRow = {
  id: string;
  user_id: string;
  game_id: string;
  rating: number;
  review: string | null;
  updated_at: string;
};

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const game = getGame(id);

  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [all, setAll] = useState<RatingRow[]>([]);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);

    const { data: rows, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("game_id", id)
      .order("updated_at", { ascending: false });

    if (error) {
      setErr(error.message);
      return;
    }
    setAll(rows ?? []);
    const mine = uid ? rows?.find((r) => r.user_id === uid) : null;
    if (mine) {
      setRating(Number(mine.rating));
      setReview(mine.review ?? "");
      setSaved(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!userId) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("ratings").upsert(
      { user_id: userId, game_id: id, rating, review, updated_at: new Date().toISOString() },
      { onConflict: "user_id,game_id" }
    );
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    load();
  }

  if (!game) return <main className="p-10 text-zinc-100">Game not found.</main>;

  const avg =
    all.length > 0 ? all.reduce((s, r) => s + Number(r.rating), 0) / all.length : null;
  const reviews = all.filter((r) => r.review && r.review.trim().length > 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href={`/sport/${game.sportSlug}`} className="text-sm text-zinc-400 hover:text-emerald-400">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{game.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {game.league} · {game.date} {game.score ? `· ${game.score}` : ""}
        </p>
        <p className="mt-4 text-zinc-300">{game.blurb}</p>

        <div className="mt-6 flex items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Fan score</div>
            <div className="text-3xl font-bold text-emerald-400">
              {avg ? avg.toFixed(1) : "—"}
            </div>
          </div>
          <div className="text-sm text-zinc-400">
            {all.length} rating{all.length === 1 ? "" : "s"} · {reviews.length} review
            {reviews.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          {userId ? (
            <>
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Your rating</h2>
                <span className="text-3xl font-bold text-emerald-400">{rating.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={rating}
                onChange={(e) => {
                  setRating(parseFloat(e.target.value));
                  setSaved(false);
                }}
                className="mt-4 w-full accent-emerald-400"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>0.5</span>
                <span>10.0</span>
              </div>
              <textarea
                value={review}
                onChange={(e) => {
                  setReview(e.target.value);
                  setSaved(false);
                }}
                placeholder="Write your review…"
                rows={5}
                className="mt-5 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-emerald-400"
              />
              <button
                onClick={save}
                disabled={busy}
                className="mt-4 w-full rounded-lg bg-emerald-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {busy ? "Saving…" : saved ? "✓ Saved" : "Save rating & review"}
              </button>
              {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
            </>
          ) : (
            <div className="text-center">
              <p className="text-zinc-300">Sign in to rate and review this one.</p>
              <Link
                href="/auth"
                className="mt-4 inline-block rounded-lg bg-emerald-400 px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold">Reviews</h2>
            <div className="mt-3 space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Fan-{r.user_id.slice(0, 4)}</span>
                    <span className="font-bold text-emerald-400">{Number(r.rating).toFixed(1)}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{r.review}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}