"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SPORTS } from "@/lib/data";

export default function NewListPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sportSlug, setSportSlug] = useState("");
  const [items, setItems] = useState<string[]>(["", "", ""]);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  function setItem(i: number, v: string) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }
  function addItem() {
    setItems((prev) => [...prev, ""]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
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
    const cleanItems = items.map((s) => s.trim()).filter(Boolean);
    if (title.trim().length < 3) return setMsg("Title needs at least 3 characters.");
    if (cleanItems.length < 2) return setMsg("Add at least 2 entries to rank.");
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
    const rows = cleanItems.map((label, idx) => ({
      list_id: list.id,
      position: idx + 1,
      label,
    }));
    const { error: itemErr } = await supabase.from("list_items").insert(rows);
    setBusy(false);
    if (itemErr) return setMsg(itemErr.message);
    router.push(`/lists/${list.id}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">New ranked list</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rank anything: teams, eras, players, games. #1 goes on top.
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
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="space-y-2">
            {items.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right font-bold text-emerald-400">
                  {i + 1}.
                </span>
                <input
                  value={val}
                  onChange={(e) => setItem(i, e.target.value)}
                  placeholder={
                    i === 0 ? "1995–96 Bulls" : i === 1 ? "2016–17 Warriors" : "Add an entry…"
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-sm outline-none focus:border-emerald-400"
                />
                <button onClick={() => move(i, -1)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-emerald-400">↑</button>
                <button onClick={() => move(i, 1)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-emerald-400">↓</button>
                <button onClick={() => removeItem(i)} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-red-400">✕</button>
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
            <span>
              {isPublic ? "Public — anyone can see this list" : "Private — only you can see this list"}
            </span>
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