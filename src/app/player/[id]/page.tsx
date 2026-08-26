"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import { cleanTeamLabel, labelPosition } from "@/lib/labels";
import BackLink from "@/components/BackLink";
import EntityRatingBox from "@/components/EntityRatingBox";
import PlayerStatsNBA from "@/components/PlayerStatsNBA";
import PlayerStatsNFL from "@/components/PlayerStatsNFL";
import PlayerStatsGeneric from "@/components/PlayerStatsGeneric";
import PlayerPhoto from "@/components/PlayerPhoto";
import { supabase } from "@/lib/supabase";
import missingPlayers from "@/lib/nba-missing-players.json";
import nflMissingPlayers from "@/lib/nfl-missing-players.json";
import mlbMissingPlayers from "@/lib/mlb-missing-players.json";
import nhlMissingPlayers from "@/lib/nhl-missing-players.json";

type Player = {
  idPlayer: string;
  strPlayer: string;
  strTeam: string | null;
  idTeam: string | null;
  strSport: string | null;
  strPosition: string | null;
  strNationality: string | null;
  dateBorn: string | null;
  strHeight: string | null;
  strWeight: string | null;
  strDescriptionEN: string | null;
  strCutout: string | null;
  strThumb: string | null;
};
type MissingP = { nbaId?: string | null; nflId?: string | null; mlbId?: string | null; nhlId?: string | null; name: string; first: string; last: string; games: number; teams: string[]; league?: string };
const GENERATED: Record<string, MissingP> = {
  ...Object.fromEntries((missingPlayers as MissingP[]).filter((m) => m.nbaId).map((m) => [`nba-${m.nbaId}`, { ...m, league: "NBA" }])),
  ...Object.fromEntries((nflMissingPlayers as MissingP[]).filter((m) => m.nflId).map((m) => [`nfl-${m.nflId}`, { ...m, league: "NFL" }])),
  ...Object.fromEntries((mlbMissingPlayers as MissingP[]).filter((m) => m.mlbId).map((m) => [`mlb-${m.mlbId}`, { ...m, league: "MLB" }])),
  ...Object.fromEntries((nhlMissingPlayers as MissingP[]).filter((m) => m.nhlId).map((m) => [`nhl-${m.nhlId}`, { ...m, league: "NHL" }])),
};

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const gen = GENERATED[id];
 if (gen) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <BackLink />
          <div className="mt-6 flex items-start gap-6">
                       <PlayerPhoto src={null} sport={gen.league === "NFL" ? "American Football" : gen.league === "MLB" ? "Baseball" : gen.league === "NHL" ? "Ice Hockey" : "Basketball"} name={gen.name} />
            <div>
              <h1 className="text-3xl font-bold">{gen.name}</h1>
              <p className="mt-1 text-sm text-zinc-400">{gen.league ?? "NBA"}{gen.first && gen.last ? ` · ${gen.first} – ${gen.last}` : ""}</p>
              <p className="mt-1 text-sm text-zinc-500">{[gen.games > 0 ? `${gen.games} games in SPORTLOG records` : null, gen.teams.slice(0, 6).join(", ")].filter(Boolean).join(" · ")}</p>
              <p className="mt-4 text-xs text-zinc-600">Page generated from SPORTLOG records.</p>
            </div>
          </div>
                    <EntityRatingBox entityType="player" entityId={id} entityName={gen.name} />
                              {gen.league === "MLB" && <PlayerStatsGeneric endpoint="/api/mlb-stats" query={`name=${encodeURIComponent(gen.name)}`} />}
          {gen.league === "NHL" && <PlayerStatsGeneric endpoint="/api/nhl-stats" query={`name=${encodeURIComponent(gen.name)}`} />}
        </div>
      </main>
    );
  }
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
 const [nbaId, setNbaId] = useState<string | null>(null);
     const [espnId, setEspnId] = useState<string | null>(null);
useEffect(() => {
    supabase.rpc("bump_click", { t: "player", i: id }).then(({ error }) => {
      if (error) console.error("bump_click failed:", error.message);
    });
  }, [id]);
  useEffect(() => {
    (async () => {
      try {
        const data = await fetch(`/api/sportsdb?mode=player&id=${id}`).then((r) => r.json());
        const p = data?.players?.[0] ?? null;
        if (!p) {
          setFailed(true);
          return;
        }
        setPlayer(p);
                setNbaId(data?.nbaId ?? null);
                        setEspnId(data?.espnId ?? null);
      } catch {
        setFailed(true);
      }
    })();
  }, [id]);

  if (failed) return <main className="p-10 text-zinc-100">Player not found.</main>;
  if (!player) return <main className="p-10 text-zinc-100">Loading…</main>;

  const photo = player.strCutout ?? player.strThumb ?? null;
  const desc = player.strDescriptionEN ?? "";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <BackLink />
        <div className="mt-6 flex items-center gap-6">
                    <PlayerPhoto src={photo} sport={player.strSport} name={player.strPlayer} />
          <div>
           <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">{player.strPlayer}</h1>
              <FollowButton entityType="player" entityId={player.idPlayer} entityName={player.strPlayer} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
             {[labelPosition(player.strPosition, player.strSport), cleanTeamLabel(player.strTeam), player.strNationality].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {player.dateBorn ? `Born ${player.dateBorn}` : ""}
              {player.strHeight ? ` · ${player.strHeight}` : ""}
              {player.strWeight ? ` · ${player.strWeight}` : ""}
            </p>
          </div>
        </div>

        {desc && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed text-zinc-300 ${expanded ? "" : "line-clamp-5"}`}>{desc}</p>
            {desc.length > 350 && (
              <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm text-emerald-400 hover:underline">
                {expanded ? "Show less" : "Read more…"}
              </button>
            )}
          </div>
        )}
                <EntityRatingBox entityType="player" entityId={player.idPlayer} entityName={player.strPlayer} />
                        {nbaId && <PlayerStatsNBA nbaId={nbaId} />}
                                {!nbaId && espnId && player.strSport === "American Football" && <PlayerStatsNFL espnId={espnId} />}
                                        {player.strSport === "Baseball" && <PlayerStatsGeneric endpoint="/api/mlb-stats" query={`name=${encodeURIComponent(player.strPlayer)}`} />}
        {player.strSport === "Ice Hockey" && <PlayerStatsGeneric endpoint="/api/nhl-stats" query={`name=${encodeURIComponent(player.strPlayer)}`} />}
      </div>
    </main>
  );
}