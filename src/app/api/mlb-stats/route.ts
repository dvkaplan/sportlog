import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (name.length < 3) return NextResponse.json({ error: "bad name" }, { status: 400 });
  try {
    const search = await fetch(
      `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } }
    ).then((r) => r.json());
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
    const person = (search?.people ?? []).find((p: { fullName?: string }) => norm(p.fullName ?? "") === norm(name)) ?? search?.people?.[0] ?? null;
    if (!person?.id) return NextResponse.json({ error: "not found" }, { status: 404 });

    const groups: { name: string; labels: string[]; seasons: { season: string; team: string; stats: (string | number)[] }[]; totals: (string | number)[] }[] = [];
    for (const g of ["hitting", "pitching"]) {
      const j = await fetch(
        `https://statsapi.mlb.com/api/v1/people/${person.id}/stats?stats=yearByYear,career&group=${g}`,
        { next: { revalidate: 86400 } }
      ).then((r) => r.json());
      const yby = j?.stats?.find((s: { type?: { displayName?: string } }) => s.type?.displayName === "yearByYear");
      const car = j?.stats?.find((s: { type?: { displayName?: string } }) => s.type?.displayName === "career");
      const rows = (yby?.splits ?? []).map((sp: { season?: string; team?: { name?: string }; stat?: Record<string, string | number> }) => {
        const s = sp.stat ?? {};
        return {
          season: sp.season ?? "",
          team: sp.team?.name ?? "",
          stats: g === "hitting"
            ? [s.gamesPlayed ?? 0, s.atBats ?? 0, s.runs ?? 0, s.hits ?? 0, s.homeRuns ?? 0, s.rbi ?? 0, s.stolenBases ?? 0, s.avg ?? "", s.obp ?? "", s.slg ?? "", s.ops ?? ""]
            : [s.gamesPlayed ?? 0, s.wins ?? 0, s.losses ?? 0, s.era ?? "", s.inningsPitched ?? "", s.strikeOuts ?? 0, s.baseOnBalls ?? 0, s.whip ?? "", s.saves ?? 0],
        };
      });
      const cs = car?.splits?.[0]?.stat ?? null;
      const totals = cs
        ? g === "hitting"
          ? [cs.gamesPlayed ?? 0, cs.atBats ?? 0, cs.runs ?? 0, cs.hits ?? 0, cs.homeRuns ?? 0, cs.rbi ?? 0, cs.stolenBases ?? 0, cs.avg ?? "", cs.obp ?? "", cs.slg ?? "", cs.ops ?? ""]
          : [cs.gamesPlayed ?? 0, cs.wins ?? 0, cs.losses ?? 0, cs.era ?? "", cs.inningsPitched ?? "", cs.strikeOuts ?? 0, cs.baseOnBalls ?? 0, cs.whip ?? "", cs.saves ?? 0]
        : [];
      if (rows.length > 0) {
        groups.push({
          name: g === "hitting" ? "Hitting" : "Pitching",
          labels: g === "hitting"
            ? ["GP", "AB", "R", "H", "HR", "RBI", "SB", "AVG", "OBP", "SLG", "OPS"]
            : ["GP", "W", "L", "ERA", "IP", "SO", "BB", "WHIP", "SV"],
          seasons: rows,
          totals,
        });
      }
    }
    if (groups.length === 0) return NextResponse.json({ error: "no stats" }, { status: 404 });
    return NextResponse.json({ categories: groups });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}