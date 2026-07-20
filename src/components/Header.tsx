"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();

  async function loadProfile(uid: string | null) {
    if (!uid) {
      setUsername(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", uid)
      .maybeSingle();
    setUsername(data?.username ?? null);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      loadProfile(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      loadProfile(uid);
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname]);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold tracking-tight">
            SPORT<span className="text-emerald-400">LOG</span>
          </Link>
          <Link href="/lists" className="text-sm text-zinc-400 hover:text-emerald-400">
            Lists
          </Link>
        </div>
        {userId ? (
          <div className="flex items-center gap-3 text-sm">
            {username ? (
              <Link href="/profile" className="text-zinc-300 hover:text-emerald-400">@{username}</Link>
            ) : (
              <Link
                href="/username"
                className="rounded bg-amber-400/10 px-3 py-1 text-amber-400 transition hover:bg-amber-400/20"
              >
                Pick a username →
              </Link>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded border border-zinc-700 px-3 py-1 transition hover:border-emerald-400"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="rounded bg-emerald-400 px-4 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}