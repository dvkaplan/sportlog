"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SPORTS } from "@/lib/data";

type Entry = { label: string; entityType?: string; entityId?: string; image?: string };
type SugResults = {
  teams?: { idTeam: string; strTeam: string; strLeague: string | null; strBadge?: string | null; strAlternate?: string | null }[];
  players?: { idPlayer: string; strPlayer: string; strTeam: string; strThumb: string | null }[];
  fighters?: { slug: string; name: string; division: string; photo?: string | null }[];
  coaches?: { kind: string; slug: string | null; idPlayer: string | null; name: string; team: string | null; photo: string | null }[];
  events?: { slug: string; name: string; date: string }[];
  seasons?: { league: string; season: string; label: string }[];
};

export default function NewListPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sportSlug, setSportSlug] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [items, setItems] = useState<Entry[]>([{ label: "" }, { label: "" }, { label: "" }]);
  const [active, setActive] = useState<number | null>(null);
  const [sugs, setSugs] = useState<SugResults>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeText = active !== null ? items[active]?.label ?? "" : "";

  useEffect(() => {
    if (active === null || activeText.trim().length < 2) {
      setSugs({});
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await fetch(
          `/api/sportsdb?mode=findteams&q=${encodeURIComponent(activeText)}`
        ).then((r) => r.json());
        setSugs(data ?? {});
      } catch {
        setSugs({});
      }
    }, 350);
    return () => clearTimeout(t);
  }, [activeText, active]);

  function setItem(i: number, patch: Partial<Entry>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function pick(i: number, e: Entry) {
    setItem(i, e);
    setSugs({});
    setActive(null);
  }
  function addItem() { setItems((p) => [...p, { label: "" }]); }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    const clean = items
      .map((e) => ({ ...e, label: e.label.trim() }))
      .filter((e) => e.label.length > 0);
    if (title.trim().length < 3) return setMsg("Title needs at least 3 characters.");
    if (clean.length < 2) return setMsg("Add at least 2 entries to rank.");
    setBusy(true);
    setMsg(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(false);
      return setMsg("Sign in first.");
    }
    const { data: list, error } = await supabase
      .from("lists")
      .insert({
        user_id: userData.user.id,
        title: title.trim(),
        description: description.trim() || null,
        sport_slug: sportSlug || null,
        is_public: isPublic,
      })
      .select()
      .single();
    if (error || !list) {
      setBusy(false);
      return setMsg(error?.message ?? "Could not create list.");
    }
    const rows = clean.map((e, idx) => ({
      list_id: list.id,
      position: idx + 1,
      label: e.label,
      entity_type: e.entityType ?? null,
      entity_id: e.entityId ?? null,
      image_url: e.image ?? null,
    }));
    const { error: itemErr } = await supabase.from("list_items").insert(rows);
    setBusy(false);
    if (itemErr) return setMsg(itemErr.message);
    router.push(`/lists/${list.id}`);
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <>
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{title}</div>
      {children}
    </>
  );
  const Row = ({ img, label, sub, fallback, onClick }: { img?: string | null; label: string; sub?: string | null; fallback: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-zinc-800">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="h-6 w-6 rounded object-cover object-top" />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs">{fallback}</div>
      )}
      <span className="truncate">{label}</span>
      {sub ? <span className="ml-auto shrink-0 text-xs text-zinc-500">{sub}</span> : null}
    </button>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">New ranked list</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rank anything: teams, players, fighters, coaches, events, seasons — pick from the dropdown to link them, or free-type anything else.
        </p>
        <div className="mt-8 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Greatest NBA teams of all time"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-emerald-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this ranking about? (optional)"
            rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-emerald-400"
          />
          <select
            value={sportSlug}
            onChange={(e) => setSportSlug(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm outline-none focus:border-emerald-400"
          >
            <option value="">All sports / general</option>
            {SPORTS.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
          <div className="space-y-2">
            {items.map((val, i) => (
              <div key={i} className="relative">
                <div className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-right font-bold text-emerald-400">{i + 1}.</span>
                  {val.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={val.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover object-top" />
                  ) : (
                    <div className="h-8 w-8 shrink-0" />
                  )}
                  <input
                    value={val.label}
                    onChange={(e) => setItem(i, { label: e.target.value, entityType: undefined, entityId: undefined, image: undefined })}
                    onFocus={() => setActive(i)}
                    placeholder={i === 0 ? "Khabib, 1995-96 Bulls, UFC 229, Redick…" : "Add an entry…"}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm outline-none focus:border-emerald-400"
                  />
                  <button onClick={() => move(i, -1)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-emerald-400">↑</button>
                  <button onClick={() => move(i, 1)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-red-400">↓</button>
                  <button onClick={() => removeItem(i)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-red-400">✕</button>
                </div>
                {active === i && (
                  (sugs.teams?.length || sugs.players?.length || sugs.fighters?.length || sugs.coaches?.length || sugs.events?.length || sugs.seasons?.length) ? (
                    <div className="absolute left-10 right-24 z-10 mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                      {(sugs.teams ?? []).length > 0 && (
                        <Section title="Teams">
                          {sugs.teams!.slice(0, 4).map((t) => (
                            <Row key={t.idTeam} img={t.strBadge} fallback="🛡️" label={t.strTeam} sub={t.strLeague}
                              onClick={() => pick(i, { label: t.strTeam, entityType: "team", entityId: t.idTeam, image: t.strBadge ?? undefined })} />
                          ))}
                        </Section>
                      )}
                      {(sugs.players ?? []).length > 0 && (
                        <Section title="Players">
                          {sugs.players!.slice(0, 4).map((p) => (
                            <Row key={p.idPlayer} img={p.strThumb} fallback="👤" label={p.strPlayer} sub={p.strTeam?.replace(/^_/, "")}
                              onClick={() => pick(i, { label: p.strPlayer, entityType: "player", entityId: p.idPlayer, image: p.strThumb ?? undefined })} />
                          ))}
                        </Section>
                      )}
                      {(sugs.fighters ?? []).length > 0 && (
                        <Section title="Fighters">
                          {sugs.fighters!.slice(0, 4).map((f) => (
                            <Row key={f.slug} img={f.photo} fallback="🥊" label={f.name} sub={f.division}
                              onClick={() => pick(i, { label: f.name, entityType: "fighter", entityId: f.slug, image: f.photo ?? undefined })} />
                          ))}
                        </Section>
                      )}
                      {(sugs.coaches ?? []).length > 0 && (
                        <Section title="Coaches">
                          {sugs.coaches!.slice(0, 3).map((c, ci) => (
                            <Row key={ci} img={c.photo} fallback="📋" label={c.name} sub={c.team ?? "Head Coach"}
                              onClick={() => pick(i, { label: c.name, entityType: "coach", entityId: c.slug ?? c.idPlayer ?? c.name, image: c.photo ?? undefined })} />
                          ))}
                        </Section>
                      )}
                      {(sugs.events ?? []).length > 0 && (
                        <Section title="Events">
                          {sugs.events!.slice(0, 3).map((e) => (
                            <Row key={e.slug} fallback="🎟️" label={e.name} sub={e.date}
                              onClick={() => pick(i, { label: e.name, entityType: "event", entityId: e.slug })} />
                          ))}
                        </Section>
                      )}
                      {(sugs.seasons ?? []).length > 0 && (
                        <Section title="Seasons">
                          {sugs.seasons!.slice(0, 3).map((s) => (
                            <Row key={`${s.league}-${s.season}`} fallback="📅" label={s.label}
                              onClick={() => pick(i, { label: s.label, entityType: "season", entityId: `${s.league}-${s.season}` })} />
                          ))}
                        </Section>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            ))}
          </div>
          <button onClick={addItem} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-400">
            + Add entry
          </button>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            <span>{isPublic ? "Public — anyone can see this list" : "Private — only you can see this list"}</span>
          </label>
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-lg bg-emerald-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish list"}
          </button>
          {msg && <p className="text-sm text-red-400">{msg}</p>}
        </div>
      </div>
    </main>
  );
}