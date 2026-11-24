"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RatingRow = { id: string; user_id: string; rating: number; review: string | null; updated_at: string };
const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;

export default function SeasonRating({ league, season, label, mode = "full" }: { league: string; season: string; label: string; mode?: "summary" | "full" }) {
  const ratingKey = `season-${league}-${season}`;
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState<RatingRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    const { data: rows } = await supabase.from("ratings").select("*").eq("game_id", ratingKey).order("updated_at", { ascending: false });
    setAll((rows ?? []) as RatingRow[]);
    const mine = uid ? (rows ?? []).find((r) => r.user_id === uid) : null;
    if (mine) { setRating(Number(mine.rating)); setReview(mine.review ?? ""); setSaved(true); }
    if (mode === "full") {
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p) => (map[p.id] = p.username));
        setNames(map);
      }
    }
  }, [ratingKey, mode]);

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
  const countLine = `${all.length} rating${all.length === 1 ? "" : "s"}, ${reviews.length} review${reviews.length === 1 ? "" : "s"}`;

  if (mode === "summary") {
    return (
      <div className="mt-6 flex items-baseline gap-4 border-b border-zinc-800 pb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-100">Average Rating</span>
        <span className="text-4xl leading-none text-accent" style={display}>{avg ? avg.toFixed(1) : "—"}</span>
        <span className="text-xs uppercase tracking-[0.12em] text-zinc-300">{countLine}</span>
        <a href="#rate" className="ml-auto text-xs uppercase tracking-[0.12em] text-zinc-300 hover:text-accent">{saved ? "Edit your rating" : "Rate this season"}</a>
      </div>
    );
  }

  return (
    <section id="rate" className="mt-16 scroll-mt-24">
      <h2 className="flex items-baseline gap-3 border-b border-zinc-700 pb-2">
        <span className="text-2xl leading-none text-zinc-100" style={display}>Rate the season</span>
        <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400">{countLine}</span>
      </h2>

      {userId ? (
        <div className="border-b border-zinc-800 py-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-zinc-100">Your rating for the {label}</span>
            <span className="text-3xl leading-none text-accent" style={display}>{rating.toFixed(1)}</span>
          </div>
          <input type="range" min="0.5" max="10" step="0.5" value={rating}
            onChange={(e) => { setRating(parseFloat(e.target.value)); setSaved(false); }}
            className="mt-4 w-full accent-accent" />
          <textarea value={review} onChange={(e) => { setReview(e.target.value); setSaved(false); }}
            placeholder="Rate the season as a story — the races, the collapses, the champion's run…" rows={3}
            className="mt-5 w-full border-0 border-b border-zinc-700 bg-transparent px-0 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-accent" />
          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={busy}
              className="border-b border-accent pb-0.5 text-xs font-semibold uppercase tracking-[0.15em] text-accent transition hover:text-zinc-100 disabled:opacity-50">
              {busy ? "Saving…" : saved ? "Saved" : "Save rating & review"}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-b border-zinc-800 py-6 text-sm text-zinc-300">
          <Link href="/auth" className="text-accent hover:underline">Sign in</Link> to rate this season.
        </div>
      )}

      {reviews.length > 0 && (
        <ol>
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-zinc-800 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-[0.12em] text-zinc-300">@{names[r.user_id] ?? `Fan-${r.user_id.slice(0, 4)}`}</span>
                <span className="text-xl leading-none text-accent" style={display}>{Number(r.rating).toFixed(1)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-100">{r.review}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}