import { NextRequest, NextResponse } from "next/server";
import { cachedResponse } from "@/lib/wiki-cache";

const UA = { "User-Agent": "SPORTLOG/1.0 (student project)" };
const clean = (s: string) => s.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/\[\d+\]/g, "").replace(/&amp;/g, "&").replace(/&#160;|&nbsp;/g, " ").replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
const SPORT_TEST: Record<string, RegExp> = {
  basketball: /\bNBA\b|basketball/i, football: /\bNFL\b|American football|quarterback|linebacker|wide receiver/i,
  baseball: /\bMLB\b|Major League Baseball|baseball/i, hockey: /\bNHL\b|ice hockey/i,
  soccer: /footballer|association football|Premier League|La Liga|Serie A|Bundesliga|Ligue 1|FIFA/i,
};
const SUFFIX: Record<string, string[]> = {
  basketball: ["(basketball)", "(basketball player)"], football: ["(American football)", "(football)"],
  baseball: ["(baseball)", "(baseball player)"], hockey: ["(ice hockey)", "(hockey)"], soccer: ["(footballer)", "(soccer)", "(footballer, born 1990)"],
};

async function parse(title: string): Promise<string | null> {
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&redirects=1`, { headers: UA, next: { revalidate: 604800 } });
  if (res.status === 429 || res.status >= 500) throw new Error("throttled");
  const text = await res.text();
  if (!text.startsWith("{")) throw new Error("throttled");
  return JSON.parse(text)?.parse?.text?.["*"] ?? null;
}
function fromInfobox(html: string): string[] {
  const m = html.match(/<th[^>]*>(?:(?!<\/th>)[\s\S]){0,200}?(?:Career highlights|Awards and highlights|Highlights and awards)[\s\S]{0,300}?<\/th>[\s\S]{0,300}?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (!m) return [];
  return [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => clean(x[1])).filter(Boolean);
}
function fromSection(html: string): string[] {
  const heads = [...html.matchAll(/<h([23])[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/h\1>/gi)]
    .map((m) => ({ level: Number(m[1]), id: m[2], idx: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const target = heads.find((h) => /Honou?rs|Awards|Achievements|Accomplishments|Career_highlights|Records_and/i.test(h.id) && !/Personal|Other|See_also/i.test(h.id));
  if (!target) return [];
  const next = heads.find((h) => h.idx > target.idx && h.level <= target.level);
  const body = html.slice(target.end, next ? next.idx : undefined);
  const out: string[] = [];
  let current = "";
  for (const t of body.matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>|<li[^>]*>([\s\S]*?)<\/li>/g)) {
    if (t[1] !== undefined) current = clean(t[1]);
    else { const item = clean(t[2]); if (item && item.length < 120) out.push(current ? `${item} — ${current}` : item); }
  }
  return out.slice(0, 40);
}
const isChamp = (s: string) => /champion|super bowl|world series|stanley cup|nba finals|premier league|la liga|serie a|bundesliga|ligue 1|champions league|world cup|fa cup|copa del rey|coppa|league title|swiss super league|eredivisie|scudetto|efl cup|community shield|super cup/i.test(s) && !/all-star|mvp|player of|team of|golden|goal of|squad of|top scorer|leader/i.test(s);
const isAward = (s: string) => /mvp|most valuable|player of the year|rookie of the year|defensive player|cy young|hart|norris|vezina|ballon|golden boot|golden glove|silver slugger|gold glove|hall of fame|all-nba|all-pro|first team|second team|scoring champion|leader|award|trophy/i.test(s);

async function handler(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const sport = (req.nextUrl.searchParams.get("sport") ?? "").toLowerCase();
  if (name.length < 3 || !SPORT_TEST[sport]) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
        if (sport === "hockey") {
      try {
        const nrm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
        const search = await fetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=10&q=${encodeURIComponent(name)}`, { next: { revalidate: 604800 } }).then((r) => r.json());
        const hit = (Array.isArray(search) ? search : []).find((p: { name?: string }) => nrm(p.name ?? "") === nrm(name)) ?? (Array.isArray(search) ? search[0] : null);
        if (hit?.playerId) {
          const land = await fetch(`https://api-web.nhle.com/v1/player/${hit.playerId}/landing`, { next: { revalidate: 604800 } }).then((r) => r.json());
          const awards: string[] = (land?.awards ?? []).map((a: { trophy?: { default?: string }; seasons?: { seasonId?: number }[] }) => {
            const yrs = (a.seasons ?? []).map((s) => { const y = String(s.seasonId ?? ""); return y.length === 8 ? `${y.slice(0, 4)}-${y.slice(6)}` : y; });
            return `${yrs.length > 1 ? `${yrs.length}× ` : ""}${a.trophy?.default ?? "Award"}${yrs.length ? ` (${yrs.join(", ")})` : ""}`;
          });
          if (awards.length > 0) {
            return NextResponse.json({
              source: "NHL", championships: awards.filter((s) => /stanley cup/i.test(s)),
              awards: awards.filter((s) => !/stanley cup/i.test(s)), other: [],
            });
          }
        }
      } catch { /* fall through to Wikipedia */ }
    }
    const candidates = [...(SUFFIX[sport] ?? []).map((s) => `${name} ${s}`), name];
    for (const title of candidates) {
      const html = await parse(title);
      if (!html || !SPORT_TEST[sport].test(html.slice(0, 20000))) continue;
            const fromBox = fromInfobox(html);
      const items = fromBox.length > 0 ? fromBox : fromSection(html);
      const uniq = [...new Set(items)];
      if (uniq.length === 0) continue;
      return NextResponse.json({
        source: title,
        championships: uniq.filter(isChamp),
        awards: uniq.filter((s) => !isChamp(s) && isAward(s)),
        other: uniq.filter((s) => !isChamp(s) && !isAward(s)),
      });
    }
    return NextResponse.json({ error: "none" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") ?? "").trim().toLowerCase();
  const sport = (req.nextUrl.searchParams.get("sport") ?? "").toLowerCase();
  return cachedResponse(`accolades|${sport}|${name}`, 60, () => handler(req));
}