"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FollowButton({
  entityType,
  entityId,
  entityName,
}: {
  entityType: "team" | "player" | "league" | "fighter" | "coach";
  entityId: string;
  entityName: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: row } = await supabase
        .from("follows")
        .select("id, is_favorite")
        .eq("user_id", uid)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();
      setFollowing(!!row);
      setFavorite(!!row?.is_favorite);
    })();
  }, [entityType, entityId]);

  async function toggleFollow() {
    if (!userId || busy) return;
    setBusy(true);
    setMsg(null);
    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("user_id", userId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      setFollowing(false);
      setFavorite(false);
    } else {
      await supabase
        .from("follows")
        .insert({ user_id: userId, entity_type: entityType, entity_id: entityId, entity_name: entityName });
      setFollowing(true);
    }
    setBusy(false);
  }

  async function toggleFavorite() {
    if (!userId || busy) return;
    setBusy(true);
    setMsg(null);
    if (!favorite) {
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_favorite", true);
      if ((count ?? 0) >= 4) {
        setMsg("Max 4 favorites — unstar one first.");
        setBusy(false);
        return;
      }
    }
    await supabase
      .from("follows")
      .update({ is_favorite: !favorite })
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    setFavorite(!favorite);
    setBusy(false);
  }

  if (!userId) return null;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleFollow}
        disabled={busy}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
          following
            ? "border border-zinc-700 text-zinc-300 hover:border-red-400 hover:text-red-400"
            : "bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
        }`}
      >
        {following ? "✓ Following" : "+ Follow"}
      </button>
      {following && (
        <button
          onClick={toggleFavorite}
          disabled={busy}
          title={favorite ? "Remove from favorites" : "Add to favorites (max 4)"}
          className={`rounded-lg border px-2.5 py-1.5 text-sm transition ${
            favorite
              ? "border-amber-400 text-amber-400"
              : "border-zinc-700 text-zinc-500 hover:border-amber-400 hover:text-amber-400"
          }`}
        >
          {favorite ? "★" : "☆"}
        </button>
      )}
      {msg && <span className="text-xs text-amber-400">{msg}</span>}
    </div>
  );
}