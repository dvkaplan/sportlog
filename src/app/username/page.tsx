"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      setMsg("3–20 characters. Letters, numbers, underscores only.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMsg("You need to sign in first.");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userData.user.id, username: clean });
    setBusy(false);
    if (error) {
      if (error.code === "23505") setMsg("That username is taken. Try another.");
      else setMsg(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-bold">Pick your username</h1>
        <p className="mt-1 text-sm text-zinc-400">
          This is how you&apos;ll appear on reviews and lists.
        </p>
        <div className="mt-8 space-y-3">
          <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-emerald-400">
            <span className="pl-3 text-zinc-500">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="DK"
              className="w-full bg-transparent p-3 text-sm outline-none"
            />
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-lg bg-emerald-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Claim username"}
          </button>
          {msg && <p className="text-sm text-red-400">{msg}</p>}
        </div>
      </div>
    </main>
  );
}