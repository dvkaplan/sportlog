"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/events";
import { ALL_FIGHTERS } from "@/lib/all-fighters";
import { OPPONENT_ALIASES } from "@/lib/fighter-extras";
import { supabase } from "@/lib/supabase";
import BackLink from "@/components/BackLink";

type RatingRow = { id: string; user_id: string; rating: number; review: string | null; updated_at: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const NAME_TO_SLUG: Record<string, string> = Object.fromEntries(ALL_FIGHTERS.map((f) => [norm(f.name), f.slug]));
Object.assign(NAME_TO_SLUG, OPPONENT_ALIASES);

function FighterName({ name }: { name: string }) {
  const slug = NAME_TO_SLUG[norm(name)];
  return slug ? (
    <Link href={`/fighter/${slug}`} onClick={(e) => e.stopPropagation()} className="hover:text-emerald-400 hover:underline underline-offset-4">
      {name}
    </Link>
  ) : (
    <span>{name}</span>
  );
}

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const event = getEvent(slug);
  const ratingKey = `event-${slug}`;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [all, setAll] = useState<RatingRow[]>([]);

  useEffect(() => {
    if (!event) return;
    supabase.rpc("bump_click", { t: "event", i: slug }).then(() => {});
  }, [event, slug]);

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

  if (!event) return <main className="p-10 text-zinc-100">Event not found.</main>;

  const avg = all.length > 0 ? all.reduce((s, r) => s + Number(r.rating), 0) / all.length : null;
  const reviews = all.filter((r) => r.review && r.review.trim().length > 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink />
        <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-emerald-400">Event</div>
        <h1 className="mt-1 text-3xl font-bold">{event.name}</h1>
        {event.date && <p className="mt-1 text-sm text-zinc-500">{event.date}</p>}

        <div className="mt-6 flex items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Fan score</div>
            <div className="text-3xl font-bold text-emerald-400">{avg ? avg.toFixed(1) : "—"}</div>
          </div>
          <div className="text-sm text-zinc-400">
            {all.length} rating{all.length === 1 ? "" : "s"} · {reviews.length} review{reviews.length === 1 ? "" : "s"} · {event.fights.length} fight{event.fights.length === 1 ? "" : "s"} on the card
          </div>
        </div>

        <h2 className="mt-8 font-semibold">The card</h2>
        <div className="mt-3 space-y-2">
          {event.fights.map((f) => {
            const [na, nb] = f.title.split(" vs ").map((s) => s.trim());
           return (
              <div
                key={f.gameId}
                onClick={() => router.push(`/game/${f.gameId}`)}
                className="block cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-emerald-400"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium">
                    <FighterName name={na ?? ""} /> <span className="text-zinc-500">vs</span> <FighterName name={nb ?? ""} />
                  </div>
                  {f.weightclass && <span className="text-xs text-amber-300">{f.weightclass}</span>}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {[f.result, f.method, f.round && `R${f.round}`, f.time].filter(Boolean).join(" · ")}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          {userId ? (
            <>
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Your rating</h2>
                <span className="text-3xl font-bold text-emerald-400">{rating.toFixed(1)}</span>
              </div>
              <input type="range" min="0.5" max="10" step="0.5" value={rating}
                onChange={(e) => { setRating(parseFloat(e.target.value)); setSaved(false); }}
                className="mt-4 w-full accent-emerald-400" />
              <textarea value={review} onChange={(e) => { setReview(e.target.value); setSaved(false); }}
                placeholder="Rate the whole card — how was this event top to bottom?" rows={4}
                className="mt-5 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-emerald-400" />
              <button onClick={save} disabled={busy}
                className="mt-4 w-full rounded-lg bg-emerald-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50">
                {busy ? "Saving…" : saved ? "✓ Saved" : "Save rating & review"}
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-zinc-300">Sign in to rate this event.</p>
              <Link href="/auth" className="mt-4 inline-block rounded-lg bg-emerald-400 px-6 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300">Sign in</Link>
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