"use client";
import { useRouter } from "next/navigation";

export default function BackLink({ fallback = "/search" }: { fallback?: string }) {
  const router = useRouter();

  function goBack() {
    // If the user landed here directly (new tab, shared link), history has
    // nowhere to go — fall back to a sensible page instead of doing nothing.
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button onClick={goBack} className="text-sm text-zinc-400 transition hover:text-emerald-400">
      ← Back
    </button>
  );
}