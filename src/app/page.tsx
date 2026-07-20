import Link from "next/link";
import { SPORTS } from "@/lib/data";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">
          SPORT<span className="text-emerald-400">LOG</span>
        </h1>
        <p className="mt-2 text-zinc-400">
          Your life in sports. Rate, review, and rank every game ever played.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SPORTS.map((s) => (
            <Link
              key={s.slug}
              href={`/sport/${s.slug}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-emerald-400 hover:bg-zinc-800"
            >
              <div className="text-3xl">{s.emoji}</div>
              <div className="mt-3 font-semibold">{s.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{s.leagues.join(" · ")}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}