import { NextRequest, NextResponse } from "next/server";
import { cachedResponse } from "@/lib/wiki-cache";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

async function handler(req: NextRequest) {
  let espnId = req.nextUrl.searchParams.get("espn") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";
  try {
    if (!espnId && name.length >= 3) {
      const sj = await fetch(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(name)}&limit=10&type=player`, { next: { revalidate: 86400 } }).then((r) => r.json());
      const items = (sj?.results ?? []).flatMap((r: { contents?: unknown[] }) => r?.contents ?? []) as { sport?: string; displayName?: string; link?: { web?: string } }[];
      for (const it of items) {
        if ((it.sport ?? "").toLowerCase() !== "basketball" || norm(it.displayName ?? "") !== norm(name)) continue;
        const m = String(it.link?.web ?? "").match(/\/id\/(\d+)/);
        if (m) { espnId = m[1]; break; }
      }
    }
    if (!/^\d+$/.test(espnId)) return NextResponse.json({ error: "not found" }, { status: 404 });
    const res = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}/stats`, { next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const j = await res.json();
    const categories = (j?.categories ?? []).map((cat: {
      name?: string; displayName?: string; labels?: string[]; names?: string[];
      statistics?: { season?: { year?: number; displayName?: string }; teamSlug?: string; stats?: string[] }[]; totals?: string[];
    }) => ({
      name: cat.displayName ?? cat.name ?? "",
      labels: cat.labels ?? cat.names ?? [],
      seasons: (cat.statistics ?? []).map((s) => ({
        season: s.season?.displayName ?? String(s.season?.year ?? ""),
        team: (s.teamSlug ?? "").toUpperCase().replace(/-/g, " "),
        stats: s.stats ?? [],
      })),
      totals: cat.totals ?? [],
    })).filter((c: { seasons: unknown[] }) => c.seasons.length > 0);
    if (categories.length === 0) return NextResponse.json({ error: "no stats" }, { status: 404 });
    return NextResponse.json({ categories, espnId });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const key = `nba-stats|${(req.nextUrl.searchParams.get("espn") ?? "").trim()}|${(req.nextUrl.searchParams.get("name") ?? "").trim().toLowerCase()}`;
  return cachedResponse(key, 1, () => handler(req));
}