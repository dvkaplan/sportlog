"use client";
import { useEffect, useState } from "react";

export type PickedEntity = { entity_type: string; entity_id: string; label: string };
type Results = {
  teams?: { idTeam: string; strTeam: string; strLeague: string | null }[];
  players?: { idPlayer: string; strPlayer: string; strTeam: string }[];
  fighters?: { slug: string; name: string; division: string }[];
  coaches?: { kind: string; slug: string | null; idPlayer: string | null; name: string; team: string | null }[];
  events?: { slug: string; name: string }[];
  seasons?: { league: string; season: string; label: string }[];
};

export default function EntityPicker({ onPick }: { onPick: (e: PickedEntity) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setRes({}); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const d = await fetch(`/api/sportsdb?mode=findteams&q=${encodeURIComponent(q)}`).then((r) => r.json());
        setRes(d ?? {});
        setOpen(true);
      } catch { setRes({}); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (e: PickedEntity) => { onPick(e); setQ(""); setRes({}); setOpen(false); };
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <>
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{title}</div>
      {children}
    </>
  );
  const Item = ({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-800">
      {label}{sub ? <span className="ml-2 text-xs text-zinc-500">{sub}</span> : null}
    </button>
  );

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search teams, players, fighters, coaches, events, seasons…"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-emerald-400" />
      {open && (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          {(res.teams ?? []).length > 0 && (
            <Section title="Teams">{res.teams!.slice(0, 5).map((t) => (
              <Item key={t.idTeam} label={t.strTeam} sub={t.strLeague ?? ""} onClick={() => pick({ entity_type: "team", entity_id: t.idTeam, label: t.strTeam })} />
            ))}</Section>
          )}
          {(res.players ?? []).length > 0 && (
            <Section title="Players">{res.players!.slice(0, 5).map((p) => (
              <Item key={p.idPlayer} label={p.strPlayer} sub={p.strTeam?.replace(/^_/, "")} onClick={() => pick({ entity_type: "player", entity_id: p.idPlayer, label: p.strPlayer })} />
            ))}</Section>
          )}
          {(res.fighters ?? []).length > 0 && (
            <Section title="Fighters">{res.fighters!.slice(0, 5).map((f) => (
              <Item key={f.slug} label={f.name} sub={f.division} onClick={() => pick({ entity_type: "fighter", entity_id: f.slug, label: f.name })} />
            ))}</Section>
          )}
          {(res.coaches ?? []).length > 0 && (
            <Section title="Coaches">{res.coaches!.slice(0, 4).map((c, i) => (
              <Item key={i} label={c.name} sub={c.team ?? "Head Coach"} onClick={() => pick({ entity_type: "coach", entity_id: c.slug ?? c.idPlayer ?? c.name, label: c.name })} />
            ))}</Section>
          )}
          {(res.events ?? []).length > 0 && (
            <Section title="Events">{res.events!.slice(0, 4).map((e) => (
              <Item key={e.slug} label={e.name} onClick={() => pick({ entity_type: "event", entity_id: e.slug, label: e.name })} />
            ))}</Section>
          )}
          {(res.seasons ?? []).length > 0 && (
            <Section title="Seasons">{res.seasons!.slice(0, 4).map((s) => (
              <Item key={`${s.league}-${s.season}`} label={s.label} onClick={() => pick({ entity_type: "season", entity_id: `${s.league}-${s.season}`, label: s.label })} />
            ))}</Section>
          )}
          {q.trim().length >= 2 && (
            <Item label={`＋ Add "${q}" as free text`} onClick={() => pick({ entity_type: "text", entity_id: "", label: q.trim() })} />
          )}
        </div>
      )}
    </div>
  );
}