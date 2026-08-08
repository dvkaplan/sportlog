"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RatingRow = { id: string; user_id: string; rating: number; review: string | null; updated_at: string };

export default function SeasonRating({ league, season, label }: { league: string; season: string; label: string }) {
  const ratingKey = `season-${league}-${season}`;
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState<RatingRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    const { data: rows } = await supabase
      .from("ratings").select("*").eq("game_id", ratingKey).order("updated_at", { ascending: false });
    setAll((rows ?? []) as RatingRow[]);
    const mine = uid ? (rows ?? []).find((r) => r.user_id === uid) : null;
    if (mine) { setRating(Number(mine.rating)); setReview(mine.review ?? ""); setSaved(true); }
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p.username));
      setNames(map);
    }
  }, [ratingKey]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from("ratings").upsert(
      { user_id: userId, game_id: ratingKey, rating, review, updated_at: new Date().toISOString() },
      { onConflict: "user_id,game_id" }
    );
    setBusy(false);
    if (!error) { setSaved(true); load(); }
  }

  const avg = all.length > 0 ? all.reduce((s, r) => s + Number(r.rating), 0) / all.length : null;
  const reviews = all.filter((r) => r.review && r.review.trim().length > 0);

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Season score</div>
            <div className="text-3xl font-bold text-emerald-400">{avg ? avg.toFixed(1) : "—"}</div>
          </div>
          <div className="text-sm text-zinc-400">
            {all.length} rating{all.length === 1 ? "" : "s"} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </div>
        </div>
        <button onClick={() => setOpen(!open)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:border-emerald-400">
          {open ? "Hide" : saved ? "Edit your rating" : "Rate this season"}
        </button>
      </div>

      {open && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          {userId ? (
            <>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Your rating for the {label}</h3>
                <span className="text-2xl font-bold text-emerald-400">{rating.toFixed(1)}</span>
              </div>
              <input type="range" min="0.5" max="10" step="0.5" value={rating}
                onChange={(e) => { setRating(parseFloat(e.target.value)); setSaved(false); }}
                className="mt-3 w-full accent-emerald-400" />
              <textarea value={review} onChange={(e) => { setReview(e.target.value); setSaved(false); }}
                placeholder="Rate the season as a story — the races, the collapses, the champion's run…" rows={3}
                className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-emerald-400" />
              <button onClick={save} disabled={busy}
                className="mt-3 w-full rounded-lg bg-emerald-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50">
                {busy ? "Saving…" : saved ? "✓ Saved" : "Save rating & review"}
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-zinc-300">Sign in to rate this season.</p>
              <Link href="/auth" className="mt-3 inline-block rounded-lg bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300">Sign in</Link>
            </div>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-zinc-800 pt-5">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">@{names[r.user_id] ?? `Fan-${r.user_id.slice(0, 4)}`}</span>
                <span className="font-bold text-emerald-400">{Number(r.rating).toFixed(1)}</span>
              </div>
              <p className="mt-1.5 text-sm text-zinc-300">{r.review}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}