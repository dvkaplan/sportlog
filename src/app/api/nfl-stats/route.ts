import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const espnId = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^\d+$/.test(espnId)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${espnId}/stats`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const j = await res.json();
    const categories = (j?.categories ?? []).map((cat: {
      name?: string; displayName?: string; labels?: string[]; names?: string[];
      statistics?: { season?: { year?: number; displayName?: string }; teamSlug?: string; stats?: string[] }[];
      totals?: string[];
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
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}