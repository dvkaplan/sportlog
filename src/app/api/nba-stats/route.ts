import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Referer: "https://www.nba.com/",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
  Accept: "application/json",
};

export async function GET(req: NextRequest) {
  const nbaId = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^\d+$/.test(nbaId)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const url = `https://stats.nba.com/stats/playercareerstats?PerMode=PerGame&PlayerID=${nbaId}`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const j = await res.json();
    const take = (name: string) => {
      const rs = j?.resultSets?.find((x: { name: string }) => x.name === name);
      if (!rs) return [];
      const h = rs.headers as string[];
      const c = (n: string) => h.indexOf(n);
      return (rs.rowSet as (string | number)[][]).map((r) => ({
        season: String(r[c("SEASON_ID")] ?? ""),
        team: String(r[c("TEAM_ABBREVIATION")] ?? ""),
        gp: r[c("GP")] ?? 0,
        min: r[c("MIN")] ?? 0,
        pts: r[c("PTS")] ?? 0,
        reb: r[c("REB")] ?? 0,
        ast: r[c("AST")] ?? 0,
        stl: r[c("STL")] ?? 0,
        blk: r[c("BLK")] ?? 0,
        fgPct: r[c("FG_PCT")] ?? 0,
        fg3Pct: r[c("FG3_PCT")] ?? 0,
        ftPct: r[c("FT_PCT")] ?? 0,
      }));
    };
    return NextResponse.json({
      regular: take("SeasonTotalsRegularSeason"),
      playoffs: take("SeasonTotalsPostSeason"),
      careerRegular: take("CareerTotalsRegularSeason"),
      careerPlayoffs: take("CareerTotalsPostSeason"),
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}