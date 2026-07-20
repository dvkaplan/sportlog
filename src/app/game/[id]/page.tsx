"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getGame } from "@/lib/data";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const game = getGame(id);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`sportlog-${id}`);
    if (stored) {
      const p = JSON.parse(stored);
      setRating(p.rating);
      setReview(p.review);
      setSaved(true);
    }
  }, [id]);

  if (!game) return <main className="p-10 text-zinc-100">Game not found.</main>;

  function save() {
    localStorage.setItem(`sportlog-${id}`, JSON.stringify({ rating, review }));
    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href={`/sport/${game.sportSlug}`} className="text-sm text-zinc-400 hover:text-emerald-400">← Back</Link>
        <h1 className="mt-4 text-2xl font-bold">{game.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{game.league} · {game.date} {game.score ? `· ${game.score}` : ""}</p>
        <p className="mt-4 text-zinc-300">{game.blurb}</p>

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Your rating</h2>
            <span className="text-3xl font-bold text-emerald-400">{rating.toFixed(1)}</span>
          </div>
          <input
            type="range" min="0.5" max="10" step="0.5" value={rating}
            onChange={(e) => { setRating(parseFloat(e.target.value)); setSaved(false); }}
            className="mt-4 w-full accent-emerald-400"
          />
          <div className="flex justify-between text-xs text-zinc-600"><span>0.5</span><span>10.0</span></div>
          <textarea
            value={review}
            onChange={(e) => { setReview(e.target.value); setSaved(false); }}
            placeholder="Write your review… What made this one great (or terrible)?"
            rows={5}
            className="mt-5 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-emerald-400"
          />
          <button
            onClick={save}
            className="mt-4 w-full rounded-lg bg-emerald-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            {saved ? "✓ Saved" : "Save rating & review"}
          </button>
          <p className="mt-3 text-xs text-zinc-600">
            Saved on this device for now — accounts & cloud sync come in Phase 2.
          </p>
        </div>
      </div>
    </main>
  );
}