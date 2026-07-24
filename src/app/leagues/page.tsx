"use client";
import { useState } from "react";
import Link from "next/link";
import teamsData from "@/lib/teams.json";
import FollowButton from "@/components/FollowButton";
import { ALL_FIGHTERS } from "@/lib/all-fighters";

type Team = { idTeam: string; strTeam: string; strLeague: string | null; strBadge: string | null };

export default function LeaguesPage() {
  const teams = teamsData as Team[];
  const byLeague: Record<string, Team[]> = {};
  for (const t of teams) {
    const key = t.strLeague ?? "Other";
    (byLeague[key] ??= []).push(t);
  }
  const leagues = Object.entries(byLeague).sort((a, b) => b[1].length - a[1].length);
  const [open, setOpen] = useState<string | null>(null);
  const combat: [string, { slug: string; name: string }[]][] = [
    ["UFC", ALL_FIGHTERS.filter((f) => f.sport === "mma").map((f) => ({ slug: f.slug, name: f.name }))],
    ["Boxing", ALL_FIGHTERS.filter((f) => f.sport === "boxing").map((f) => ({ slug: f.slug, name: f.name }))],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold">Leagues</h1>
        <p className="mt-1 text-sm text-zinc-400">Browse every team by league. Follow leagues to build your feed.</p>
        <div className="mt-8 space-y-3">
            {combat.map(([name, fs]) => (
            <div key={name} className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => setOpen(open === name ? null : name)} className="flex-1 text-left">
                  <span className="font-semibold">{name === "UFC" ? "UFC" : "Boxing"}</span>
                  <span className="ml-2 text-xs text-zinc-500">{fs.length} fighters · {open === name ? "▲" : "▼"}</span>
                </button>
                <FollowButton entityType="league" entityId={name} entityName={name} />
              </div>
              {open === name && (
                <div className="flex flex-wrap gap-2 border-t border-zinc-800 p-4">
                  {fs.map((f) => (
                    <Link key={f.slug} href={`/fighter/${f.slug}`} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm transition hover:border-emerald-400">
                      {f.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {leagues.map(([name, ts]) => (
            <div key={name} className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => setOpen(open === name ? null : name)} className="flex-1 text-left">
                  <span className="font-semibold">{name}</span>
                  <span className="ml-2 text-xs text-zinc-500">{ts.length} teams · {open === name ? "▲" : "▼"}</span>
                </button>
                <FollowButton entityType="league" entityId={name} entityName={name} />
              </div>
              {open === name && (
                <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-4 sm:grid-cols-3">
                  {ts
                    .sort((a, b) => a.strTeam.localeCompare(b.strTeam))
                    .map((t) => (
                      <Link
                        key={t.idTeam}
                        href={`/team/${t.idTeam}`}
                        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-sm transition hover:border-emerald-400"
                      >
                        {t.strBadge ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.strBadge} alt="" className="h-8 w-8 object-contain" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-zinc-800" />
                        )}
                        <span>{t.strTeam}</span>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}