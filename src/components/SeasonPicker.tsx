"use client";
import { useRouter } from "next/navigation";

export default function SeasonPicker({ league, seasons, current }: { league: string; seasons: string[]; current: string }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/seasons/${league}/${e.target.value}`)}
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-400"
    >
      {[...seasons].reverse().map((s) => (
        <option key={s} value={s}>{s} season</option>
      ))}
    </select>
  );
}