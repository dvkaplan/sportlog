"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// "game" reviews live in the ratings table (games, fights, events, seasons);
// "entity" reviews live in entity_ratings (players, coaches, fighters, teams).
export type ReviewKind = "game" | "entity";
export type ReviewRow = { id: string | number; user_id: string; rating: number; review: string | null; updated_at: string };

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const label = "text-xs uppercase tracking-[0.12em]";
export const reviewHref = (kind: ReviewKind, id: string | number) => `/review/${kind === "game" ? "g" : "e"}-${id}`;
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fanName = (names: Record<string, string>, uid: string) => names[uid] ?? `Fan-${uid.slice(0, 4)}`;

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />
    </svg>
  );
}

function LikeButton({ liked, count, onToggle }: { liked: boolean; count: number; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 ${label} transition hover:text-accent ${liked ? "text-accent" : "text-zinc-300"}`}>
      <Heart filled={liked} />
      <span>{count > 0 ? `${count} like${count === 1 ? "" : "s"}` : "Like"}</span>
    </button>
  );
}

// Likes for a set of reviews: counts, which ones the signed-in user liked, and a toggle.
function useLikes(kind: ReviewKind, ids: string[], userId: string | null) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const key = ids.join(",");

  useEffect(() => {
    let alive = true;
    if (!key) return;
    (async () => {
      const { data } = await supabase.from("review_likes").select("review_id, user_id").eq("review_kind", kind).in("review_id", key.split(",")).limit(5000);
      if (!alive) return;
      const c: Record<string, number> = {}, m: Record<string, boolean> = {};
      for (const r of (data ?? []) as { review_id: string; user_id: string }[]) {
        c[r.review_id] = (c[r.review_id] ?? 0) + 1;
        if (userId && r.user_id === userId) m[r.review_id] = true;
      }
      setCounts(c); setMine(m);
    })();
    return () => { alive = false; };
  }, [kind, key, userId]);

  const toggle = useCallback(async (id: string) => {
    if (!userId) { router.push("/auth"); return; }
    const was = !!mine[id];
    const apply = (liked: boolean) => {
      setMine((m) => ({ ...m, [id]: liked }));
      setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + (liked ? 1 : -1)) }));
    };
    apply(!was); // show it straight away, undo if the save fails
    const { error } = was
      ? await supabase.from("review_likes").delete().match({ review_kind: kind, review_id: id, user_id: userId })
      : await supabase.from("review_likes").insert({ review_kind: kind, review_id: id, user_id: userId });
    if (error && error.code !== "23505") apply(was);
  }, [kind, userId, mine, router]);

  return { counts, mine, toggle };
}

// ---------------------------------------------------------------- list of reviews (game, event, season, player… pages)
export default function ReviewList({ kind, reviews, names, userId, heading = true }: {
  kind: ReviewKind; reviews: ReviewRow[]; names: Record<string, string>; userId: string | null; heading?: boolean;
}) {
  const ids = reviews.map((r) => String(r.id));
  const key = ids.join(",");
  const { counts, mine, toggle } = useLikes(kind, ids, userId);
  const [comments, setComments] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    if (!key) return;
    (async () => {
      const { data } = await supabase.from("review_comments").select("review_id").eq("review_kind", kind).in("review_id", key.split(",")).limit(5000);
      if (!alive) return;
      const c: Record<string, number> = {};
      for (const r of (data ?? []) as { review_id: string }[]) c[r.review_id] = (c[r.review_id] ?? 0) + 1;
      setComments(c);
    })();
    return () => { alive = false; };
  }, [kind, key]);

  if (reviews.length === 0) return null;
  return (
    <section className={heading ? "mt-10" : ""}>
      {heading && (
        <h2 className="flex items-baseline gap-3 border-b border-zinc-700 pb-2">
          <span className="text-2xl leading-none text-zinc-100" style={display}>Reviews</span>
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400">{reviews.length}</span>
        </h2>
      )}
      <ol>
        {reviews.map((r) => {
          const id = String(r.id);
          const href = reviewHref(kind, r.id);
          const n = comments[id] ?? 0;
          return (
            <li key={id} className="border-b border-zinc-800 py-4">
              <div className="flex items-baseline justify-between">
                <span className={`${label} text-zinc-300`}>@{fanName(names, r.user_id)}</span>
                <span className="text-xl leading-none text-accent" style={display}>{Number(r.rating).toFixed(1)}</span>
              </div>
              <Link href={href} className="group mt-2 block">
                <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-zinc-100 transition group-hover:text-white">{r.review}</p>
              </Link>
              <div className="mt-3 flex items-center gap-5">
                <LikeButton liked={!!mine[id]} count={counts[id] ?? 0} onToggle={() => toggle(id)} />
                <Link href={href} className={`${label} text-zinc-300 transition hover:text-accent`}>
                  {n > 0 ? `${n} comment${n === 1 ? "" : "s"}` : "Comment"}
                </Link>
                <span className={`ml-auto ${label} text-zinc-500`}>{fmtDate(r.updated_at)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- one review's like button + comment thread (the review page)
type CommentRow = { id: string; user_id: string; body: string; created_at: string };

export function ReviewThread({ kind, reviewId }: { kind: ReviewKind; reviewId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { counts, mine, toggle } = useLikes(kind, [reviewId], userId);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    setUserId(userData.user?.id ?? null);
    const { data, error } = await supabase.from("review_comments").select("id, user_id, body, created_at")
      .eq("review_kind", kind).eq("review_id", reviewId).order("created_at", { ascending: true }).limit(500);
    setReady(true);
    if (error) { setErr("Comments are not available right now."); return; }
    const list = (data ?? []) as CommentRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p.username));
      setNames(map);
    }
  }, [kind, reviewId]);

  useEffect(() => { load(); }, [load]);

  async function post() {
    const text = body.trim();
    if (!userId || !text) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from("review_comments").insert({ review_kind: kind, review_id: reviewId, user_id: userId, body: text.slice(0, 2000) });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setBody("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("review_comments").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    setRows((r) => r.filter((c) => c.id !== id));
  }

  return (
    <>
      <div className="mt-6 border-b border-zinc-800 pb-5">
        <LikeButton liked={!!mine[reviewId]} count={counts[reviewId] ?? 0} onToggle={() => toggle(reviewId)} />
      </div>

      <section className="mt-12">
        <h2 className="flex items-baseline gap-3 border-b border-zinc-700 pb-2">
          <span className="text-2xl leading-none text-zinc-100" style={display}>Comments</span>
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400">{rows.length}</span>
        </h2>

        {rows.length > 0 && (
          <ol>
            {rows.map((c) => (
              <li key={c.id} className="border-b border-zinc-800 py-4">
                <div className="flex items-baseline gap-4">
                  <span className={`${label} text-zinc-300`}>@{fanName(names, c.user_id)}</span>
                  <span className={`${label} text-zinc-500`}>{fmtDate(c.created_at)}</span>
                  {userId === c.user_id && (
                    <button type="button" onClick={() => remove(c.id)} className={`ml-auto ${label} text-zinc-500 transition hover:text-accent`}>Delete</button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-100">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
        {ready && rows.length === 0 && !err && <p className="border-b border-zinc-800 py-4 text-sm text-zinc-400">No comments yet.</p>}

        {!ready ? null : userId ? (
          <div className="py-5">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3}
              placeholder="Add a comment…"
              className="w-full border-0 border-b border-zinc-700 bg-transparent px-0 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-accent" />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={post} disabled={busy || body.trim().length === 0}
                className="border-b border-accent pb-0.5 text-xs font-semibold uppercase tracking-[0.15em] text-accent transition hover:text-zinc-100 disabled:opacity-50">
                {busy ? "Posting…" : "Post comment"}
              </button>
            </div>
          </div>
        ) : (
          <p className="py-5 text-sm text-zinc-300"><Link href="/auth" className="text-accent hover:underline">Sign in</Link> to like and comment.</p>
        )}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </section>
    </>
  );
}