import { NextRequest, NextResponse } from "next/server";
import { cachedResponse } from "@/lib/wiki-cache";
const UA = { "User-Agent": "SportLog/1.0 (https://sportlog-tau.vercel.app; donvkap@gmail.com) node-fetch" };
const clean = (s: string) => s.replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/\[\d+\]/g, "").replace(/&amp;/g, "&").replace(/&#160;|&nbsp;/g, " ").replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();

async function handler(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (name.length < 3) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
        const exact = req.nextUrl.searchParams.get("title") ?? "";
    for (const title of exact ? [exact] : [name, `${name} (basketball)`, `${name} (American football)`, `${name} (coach)`, `${name} (ice hockey)`, `${name} (baseball)`]) {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&redirects=1`, { headers: UA, next: { revalidate: 604800 } });
            if (res.status === 429 || res.status >= 500) throw new Error("throttled");
      const rawText = await res.text();
      if (!rawText.startsWith("{")) throw new Error("throttled");
      const html: string = JSON.parse(rawText)?.parse?.text?.["*"] ?? "";
      if (!html || !/coach|manager/i.test(html.slice(0, 30000))) continue;

           // Infobox career list with "As a player / As a coach" sub-labels — keep only the coach rows
      const career: { years: string; team: string }[] = [];
      const ci = html.search(/<th[^>]*>(?:(?!<\/th>)[\s\S]){0,150}?(?:Career history|Coaching career|Coaching history|Managerial career)[\s\S]{0,100}?<\/th>/i);
      if (ci >= 0) {
        const chunk = html.slice(ci, ci + 15000);
        let mode: "player" | "coach" | "unknown" = /Coaching career|Coaching history|Managerial career/i.test(chunk.slice(0, 300)) ? "coach" : "unknown";
        let sawLabel = false;
        for (const r of chunk.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
          const row = r[1];
          const text = clean(row);
          if (/^As (a )?(player|athlete)/i.test(text) || /^Playing career/i.test(text)) { mode = "player"; sawLabel = true; continue; }
          if (/^As (a )?(coach|manager|head coach)/i.test(text) || /^Coaching career/i.test(text)) { mode = "coach"; sawLabel = true; continue; }
          const m = row.match(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/);
          if (!m) { if (career.length > 0 && /<th[^>]*colspan/i.test(row)) break; continue; }
          const y = clean(m[1]), t = clean(m[2]);
          if (!/^\d{4}/.test(y)) { if (career.length > 0) break; continue; }
          if (mode === "coach" || (mode === "unknown" && !sawLabel)) career.push({ years: y, team: t });
        }
        if (!sawLabel && mode === "unknown") career.length = 0; // ambiguous list with no labels — don't guess
      }

            // Every wikitable under the coaching-record heading, each labeled by its subsection
      type Tbl = { label: string; columns: string[]; rows: string[][] };
      const tables: Tbl[] = [];
      const hi = html.search(/<h[23][^>]*id="[^"]*(?:Head_coaching_record|Coaching_record|Managerial_record|Head_coaching_statistics|Coaching_statistics)[^"]*"/i);
      if (hi >= 0) {
        const after = html.slice(hi);
        const endRel = after.slice(10).search(/<h2[^>]*>/i);
        const section = endRel >= 0 ? after.slice(0, endRel + 10) : after;
        const attr = (s: string, k: string) => Number((s.match(new RegExp(`${k}="?(\\d+)`)) ?? [])[1] ?? 1);
        let label = "";
        for (const tok of section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>|<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)) {
          if (tok[1] !== undefined) { label = clean(tok[1]); continue; }
          const trs = [...tok[2].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
          const isHeader = (r: string) => /<th/i.test(r) && !/<td/i.test(r);
          const headerRows: string[] = [];
          let i = 0;
          while (i < trs.length && isHeader(trs[i])) { headerRows.push(trs[i]); i++; }
          if (headerRows.length === 0) continue;
          const cells = (r: string) => [...r.matchAll(/<th([^>]*)>([\s\S]*?)<\/th>/gi)].map((m) => ({ text: clean(m[2]), colspan: attr(m[1], "colspan"), rowspan: attr(m[1], "rowspan") }));
          let columns: string[] = [];
          if (headerRows.length === 1) {
            columns = cells(headerRows[0]).flatMap((c) => Array(c.colspan).fill(c.text));
          } else {
            const top = cells(headerRows[0]), sub = cells(headerRows[1]);
            let si = 0;
            for (const c of top) {
              if (c.rowspan > 1) columns.push(c.text);
              else for (let k = 0; k < c.colspan; k++) { const s = sub[si++]; columns.push(s ? (c.colspan > 1 ? `${c.text} ${s.text}` : s.text) : c.text); }
            }
          }
          // body with rowspan carry-over so multi-season team cells don't shift columns
          const rows: string[][] = [];
          const carry: { text: string; left: number }[] = [];
          for (const r of trs.slice(i)) {
            const tds = [...r.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map((m) => ({ text: clean(m[2]), rowspan: attr(m[1], "rowspan"), colspan: attr(m[1], "colspan") }));
            const row: string[] = [];
            let ci = 0, ti = 0;
            while (ci < columns.length && (ti < tds.length || carry[ci]?.left > 0)) {
              if (carry[ci]?.left > 0) { row.push(carry[ci].text); carry[ci].left--; ci++; continue; }
              const c = tds[ti++]; if (!c) break;
              for (let k = 0; k < c.colspan; k++) { row.push(k === 0 ? c.text : ""); if (c.rowspan > 1) carry[ci] = { text: c.text, left: c.rowspan - 1 }; ci++; }
            }
            if (row.length >= 3 && row.some((x) => /\d/.test(x))) rows.push(row.slice(0, columns.length));
          }
          if (rows.length > 0) tables.push({ label, columns: columns.slice(0, 12), rows: rows.slice(0, 80).map((r) => r.slice(0, 12)) });
        }
      }
      const record = tables[0] ?? null;
      if (career.length === 0 && !record) continue;
            return NextResponse.json({ source: title, career, record, tables });
    }
    return NextResponse.json({ error: "none" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
     const name = (req.nextUrl.searchParams.get("name") ?? "").trim().toLowerCase();
       const title = (req.nextUrl.searchParams.get("title") ?? "").trim().toLowerCase();
  return cachedResponse(`coach-history|${name}|${title}`, 60, () => handler(req));
   }