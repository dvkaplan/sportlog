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
          <Link href="/" className="text-2xl leading-none tracking-tight" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
            Sport<span className="text-accent">log</span>
          </Link>
          <Link href="/lists" className="text-sm text-zinc-300 hover:text-accent">
            Lists
          </Link>
          <Link href="/search" className="text-sm text-zinc-300 hover:text-accent">
            Search
          </Link>
          <Link href="/leagues" className="text-sm text-zinc-300 hover:text-accent">
            Leagues
          </Link>
        </div>
        {userId ? (
          <div className="flex items-center gap-3 text-sm">
            {username ? (
              <Link href="/profile" className="text-zinc-300 hover:text-accent">@{username}</Link>
            ) : (
              <Link
                href="/username"
                className="rounded bg-accent/10 px-3 py-1 text-accent transition hover:bg-accent/20"
              >
                Pick a username →
              </Link>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded border border-zinc-700 px-3 py-1 transition hover:border-accent"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-accent"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}