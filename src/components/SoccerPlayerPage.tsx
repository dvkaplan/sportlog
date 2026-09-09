"use client";
import { useEffect, useState } from "react";
import BackLink from "@/components/BackLink";
import PlayerPhoto from "@/components/PlayerPhoto";
import EntityRatingBox from "@/components/EntityRatingBox";
import PlayerStatsGeneric from "@/components/PlayerStatsGeneric";

type Profile = { name: string; position: string | null; team: string | null; nationality: string | null; born: string | null; height: string | null; headshot: string | null };

export default function SoccerPlayerPage({ espnId, id }: { espnId: string; id: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const j = await fetch(`/api/soccer-stats?id=${espnId}`).then((r) => r.json());
        if (j?.error || !j?.profile) { setFailed(true); return; }
        setProfile(j.profile);
      } catch { setFailed(true); }
    })();
  }, [espnId]);
  if (failed) return <main className="p-10 text-zinc-100">Player not found.</main>;
  if (!profile) return <main className="p-10 text-zinc-100">Loading…</main>;
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink />
        <div className="mt-6 flex items-start gap-6">
          <PlayerPhoto src={profile.headshot} name={profile.name} />
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">{["⚽ Soccer", profile.position, profile.team, profile.nationality].filter(Boolean).join(" · ")}</p>
            <p className="mt-1 text-xs text-zinc-500">{[profile.born ? `Born ${profile.born}` : null, profile.height].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <PlayerStatsGeneric endpoint="/api/soccer-stats" query={`id=${espnId}`} />
        <EntityRatingBox entityType="player" entityId={id} entityName={profile.name} />
      </div>
    </main>
  );
}