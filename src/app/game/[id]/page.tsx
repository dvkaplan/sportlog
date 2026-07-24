"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getGame } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import BackLink from "@/components/BackLink";
import { ALL_FIGHTERS } from "@/lib/all-fighters";
import fightStats from "@/lib/fight-stats.json";
import { OPPONENT_ALIASES } from "@/lib/fighter-extras";

type FStat = { kd: number; sig: string; sigPct: number; total: string; td: string; sub: number; ctrl: string; head: string; body: string; leg: string; dist: string; clinch: string; ground: string };
type FightMeta = { event: string; weightclass: string; method: string; round: string; time: string; format: string; referee: string; details: string; fighters: { name: string; stats?: FStat }[] };
const FSTATS = fightStats as Record<string, FightMeta>;


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
  const [names, setNames] = useState<Record<string, string>>({});

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
        <BackLink />
        <h1 className="mt-4 text-2xl font-bold">{game.title}</h1>
        {game.id.startsWith("fight-") && (
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {game.title.split(" vs ").map((n) => {
             const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
              const key = norm(n);
              const slug = OPPONENT_ALIASES[key] ?? ALL_FIGHTERS.find((x) => norm(x.name) === key)?.slug;
              const f = slug ? { slug } : null;
              return f ? (
                <Link key={n} href={`/fighter/${f.slug}`} className="rounded-full border border-zinc-700 px-3 py-1 text-emerald-400 transition hover:border-emerald-400">
                  {n.trim()}
                </Link>
              ) : (
                <span key={n} className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-500">{n.trim()}</span>
              );
            })}
          </div>
        )}
        {(() => {
            {game.id.startsWith("fight-") && !FSTATS[game.id] && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">Bout details</div>
            <div className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
              <div><span className="text-zinc-500">Result:</span> {game.score || "—"}</div>
              <div><span className="text-zinc-500">Event:</span> {game.blurb || "—"}</div>
              <div><span className="text-zinc-500">Date:</span> {game.date || "—"}</div>
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              Round-by-round strike statistics were never recorded for this bout (pre-analytics era or non-UFC promotion).
            </p>
          </div>
        )}
          const fs = FSTATS[game.id];
          if (!fs) return null;
          const rows: [string, (s: FStat) => string | number][] = [
            ["KD", (s) => s.kd], ["Sig. Strikes", (s) => s.sig], ["Sig. %", (s) => `${s.sigPct}%`],
            ["Total Strikes", (s) => s.total], ["Takedowns", (s) => s.td], ["Sub. Attempts", (s) => s.sub], ["Control", (s) => s.ctrl],
          ];
          const brk: [string, (s: FStat) => string][] = [
            ["Head", (s) => s.head], ["Body", (s) => s.body], ["Leg", (s) => s.leg],
            ["Distance", (s) => s.dist], ["Clinch", (s) => s.clinch], ["Ground", (s) => s.ground],
          ];
          const [fa, fb] = fs.fighters;
          return (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                  {fs.weightclass || "Bout details"}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <div><span className="text-zinc-500">Method:</span> {fs.method}</div>
                  <div><span className="text-zinc-500">Round:</span> {fs.round}</div>
                  <div><span className="text-zinc-500">Time:</span> {fs.time}</div>
                  {fs.format && <div><span className="text-zinc-500">Format:</span> {fs.format}</div>}
                  {fs.referee && <div><span className="text-zinc-500">Referee:</span> {fs.referee}</div>}
                  {fs.details && <div className="col-span-2 sm:col-span-3"><span className="text-zinc-500">Details:</span> {fs.details}</div>}
                </div>
              </div>
              {fa?.stats && fb?.stats && (
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    <span className="truncate text-left text-emerald-400">{fa.name}</span><span>Totals</span><span className="truncate text-right text-emerald-400">{fb.name}</span>
                  </div>
                  {rows.map(([label, get]) => (
                    <div key={label} className="grid grid-cols-3 px-4 py-1.5 text-center text-sm odd:bg-zinc-900 even:bg-zinc-950/50">
                      <span className="text-left font-medium">{get(fa.stats!)}</span>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
                      <span className="text-right font-medium">{get(fb.stats!)}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 border-t border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    <span /><span>Sig. Strike Breakdown</span><span />
                  </div>
                  {brk.map(([label, get]) => (
                    <div key={label} className="grid grid-cols-3 px-4 py-1.5 text-center text-sm odd:bg-zinc-900 even:bg-zinc-950/50">
                      <span className="text-left">{get(fa.stats!)}</span>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
                      <span className="text-right">{get(fb.stats!)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-600">Fight data via ufcstats.com (open community dataset).</p>
            </div>
          );
        })()}
        
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
                    <span className="text-zinc-400">@{names[r.user_id] ?? `Fan-${r.user_id.slice(0, 4)}`}</span>
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