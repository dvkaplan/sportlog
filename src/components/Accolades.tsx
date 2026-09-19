"use client";
import { useEffect, useState } from "react";

type Data = { source: string; championships: string[]; awards: string[]; other: string[] };

export default function Accolades({ name, sport }: { name: string; sport: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const j = await fetch(`/api/accolades?name=${encodeURIComponent(name)}&sport=${sport}`).then((r) => r.json());
        if (j?.error) { setGone(true); return; }
        setData(j);
      } catch { setGone(true); }
    })();
  }, [name, sport]);
  if (gone || !data) return null;
  const Group = ({ title, icon, items }: { title: string; icon: string; items: string[] }) =>
    items.length === 0 ? null : (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h3>
        <ul className="mt-2 space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-200"><span className="shrink-0">{icon}</span><span>{it}</span></li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="mt-10 rounded-xl border border-accent/30 bg-zinc-900 p-5">
      <h2 className="font-semibold text-accent">Accolades</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Group title="Championships" icon="🏆" items={data.championships} />
        <Group title="Awards & honors" icon="🥇" items={data.awards} />
        <Group title="Career highlights" icon="•" items={data.other} />
      </div>
      <p className="mt-4 text-xs text-zinc-600">
        Via <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(data.source)}`} target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">Wikipedia</a>, CC BY-SA
      </p>
    </div>
  );
}