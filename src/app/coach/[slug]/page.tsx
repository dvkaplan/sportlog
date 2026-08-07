"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import staffData from "@/lib/team-staff.json";
import coachMediaData from "@/lib/coach-media.json";
import teamsData from "@/lib/teams.json";
import { coachTitle } from "@/lib/labels";
import { supabase } from "@/lib/supabase";
import FollowButton from "@/components/FollowButton";
import BackLink from "@/components/BackLink";

type Staff = { headCoach: string | null };
type Team = { idTeam: string; strTeam: string; strSport: string | null; strBadge: string | null };
type CoachM = { name: string; photo: string | null; bio: string | null };

const personSlug = (n: string) =>
  (n ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CoachPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const STAFF = staffData as Record<string, Staff>;
  const MEDIA = coachMediaData as Record<string, CoachM>;
  const TEAMS = teamsData as Team[];
  const [expanded, setExpanded] = useState(false);

  const media = MEDIA[slug] ?? null;
  const teams = TEAMS.filter((t) => STAFF[t.idTeam]?.headCoach && personSlug(STAFF[t.idTeam].headCoach!) === slug);
  const name = media?.name ?? teams.map((t) => STAFF[t.idTeam].headCoach).find(Boolean) ?? null;

  useEffect(() => {
    if (name) supabase.rpc("bump_click", { t: "coach", i: slug }).then(() => {});
  }, [name, slug]);

  if (!name) return <main className="p-10 text-zinc-100">Coach not found.</main>;
  const bio = media?.bio ?? "";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink />
        <div className="mt-6 flex items-start gap-6">
          {media?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.photo} alt={name} className="h-28 w-28 shrink-0 rounded-xl object-cover object-top" />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-3xl">📋</div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-bold">{name}</h1>
              <FollowButton entityType="coach" entityId={slug} entityName={name} />
            </div>
            {teams.map((t) => (
              <Link key={t.idTeam} href={`/team/${t.idTeam}`} className="mt-2 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-1.5 text-sm transition hover:border-emerald-400">
                {t.strBadge && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.strBadge} alt="" className="h-5 w-5 object-contain" />
                )}
                {coachTitle(t.strSport)} · {t.strTeam}
              </Link>
            ))}
          </div>
        </div>
        {bio && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed text-zinc-300 ${expanded ? "" : "line-clamp-6"}`}>{bio}</p>
            {bio.length > 400 && (
              <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm text-emerald-400 hover:underline">
                {expanded ? "Show less" : "Read more…"}
              </button>
            )}
            <p className="mt-1 text-xs text-zinc-600">Bio & photo via Wikipedia, CC BY-SA</p>
          </div>
        )}
      </div>
    </main>
  );
}