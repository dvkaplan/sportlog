"use client";
import { useEffect, useState } from "react";

type Tbl = { label: string; columns: string[]; rows: string[][] };
type Data = { source: string; career: { years: string; team: string }[]; record: Tbl | null; tables?: Tbl[] };

export default function CoachHistory({ name }: { name: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const j = await fetch(`/api/coach-history?name=${encodeURIComponent(name)}`).then((r) => r.json());
        if (j?.error) { setGone(true); return; }
        setData(j);
      } catch { setGone(true); }
    })();
  }, [name]);
  if (gone || !data) return null;
  return (
    <div className="mt-10">
     
            {(data.tables ?? (data.record ? [data.record] : [])).map((tbl, ti) => (
        <div key={ti}>
          <h2 className={`${ti === 0 ? "" : "mt-8 "}font-semibold`}>Head coaching record{tbl.label && !/record/i.test(tbl.label) ? ` — ${tbl.label}` : ""}</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                <tr>{tbl.columns.map((c, i) => <th key={i} className={`px-3 py-2 ${i < 2 ? "text-left" : "text-right"}`}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {tbl.rows.map((r, i) => (
                  <tr key={i} className={`border-t border-zinc-800/60 ${/total|career/i.test(r[0] ?? "") ? "bg-zinc-900 font-semibold" : "hover:bg-zinc-900/50"}`}>
                    {r.map((c, k) => <td key={k} className={`px-3 py-1.5 ${k < 2 ? "" : "text-right"}`}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="mt-2 text-xs text-zinc-600">Via <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(data.source)}`} target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">Wikipedia</a>, CC BY-SA</p>
    </div>
  );
}