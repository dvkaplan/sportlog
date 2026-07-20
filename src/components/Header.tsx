"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold tracking-tight">
          SPORT<span className="text-emerald-400">LOG</span>
        </Link>
        {email ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-zinc-400 sm:inline">{email}</span>
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