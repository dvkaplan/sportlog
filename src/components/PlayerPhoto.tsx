/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";

export default function PlayerPhoto({
  src,
  name,
  size = "lg",
}: {
  src: string | null;
  name: string;
  size?: "lg" | "sm";
  sport?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const cls = size === "lg" ? "h-28 w-28 rounded-xl" : "h-10 w-10 rounded-lg";
  if (src && !broken) {
    return <img src={src} alt={name} onError={() => setBroken(true)} className={`${cls} shrink-0 object-cover object-top`} />;
  }
  return (
    <div className={`${cls} flex shrink-0 items-end justify-center overflow-hidden bg-zinc-800`}>
      <svg viewBox="0 0 100 100" className="h-[85%] w-[85%] text-zinc-600" fill="currentColor" aria-hidden>
        <circle cx="50" cy="32" r="20" />
        <path d="M50 56 C28 56 14 72 12 100 L88 100 C86 72 72 56 50 56 Z" />
      </svg>
    </div>
  );
}