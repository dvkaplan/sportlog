import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (name.length < 3) return NextResponse.json({ error: "bad name" }, { status: 400 });
  try {
    const search = await fetch(
      `https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=10&q=${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } }
    ).then((r) => r.json());
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
    const hit = (Array.isArray(search) ? search : []).find((p: { name?: string }) => norm(p.name ?? "") === norm(name)) ?? (Array.isArray(search) ? search[0] : null);
    if (!hit?.playerId) return NextResponse.json({ error: "not found" }, { status: 404 });

    const j = await fetch(`https://api-web.nhle.com/v1/player/${hit.playerId}/landing`, { next: { revalidate: 86400 } }).then((r) => r.json());
    const seasons = (j?.seasonTotals ?? []).filter(
      (s: { leagueAbbrev?: string; gameTypeId?: number }) => s.leagueAbbrev === "NHL" && s.gameTypeId === 2
    );
    if (seasons.length === 0) return NextResponse.json({ error: "no stats" }, { status: 404 });
    const isGoalie = (j?.position ?? "") === "G";
    const fmtSeason = (s: number) => `${String(s).slice(0, 4)}-${String(s).slice(6)}`;
    const rows = seasons.map((s: Record<string, unknown>) => ({
      season: fmtSeason(Number(s.season ?? 0)),
      team: String((s.teamName as { default?: string })?.default ?? ""),
      stats: isGoalie
        ? [s.gamesPlayed ?? 0, s.wins ?? 0, s.losses ?? 0, s.goalsAgainstAvg != null ? Number(s.goalsAgainstAvg).toFixed(2) : "", s.savePctg != null ? Number(s.savePctg).toFixed(3) : "", s.shutouts ?? 0]
        : [s.gamesPlayed ?? 0, s.goals ?? 0, s.assists ?? 0, s.points ?? 0, s.plusMinus ?? "", s.pim ?? 0],
    }));
    const ct = j?.careerTotals?.regularSeason ?? null;
    const totals = ct
      ? isGoalie
        ? [ct.gamesPlayed ?? 0, ct.wins ?? 0, ct.losses ?? 0, ct.goalsAgainstAvg != null ? Number(ct.goalsAgainstAvg).toFixed(2) : "", ct.savePctg != null ? Number(ct.savePctg).toFixed(3) : "", ct.shutouts ?? 0]
        : [ct.gamesPlayed ?? 0, ct.goals ?? 0, ct.assists ?? 0, ct.points ?? 0, ct.plusMinus ?? "", ct.pim ?? 0]
      : [];
    return NextResponse.json({
      categories: [{
        name: isGoalie ? "Goaltending" : "Skating",
        labels: isGoalie ? ["GP", "W", "L", "GAA", "SV%", "SO"] : ["GP", "G", "A", "P", "+/-", "PIM"],
        seasons: rows,
        totals,
      }],
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}