import { NextRequest, NextResponse } from "next/server";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const BASE = "https://site.web.api.espn.com/apis/common/v3/sports/soccer";
type Opt = { value: string; displayValue: string };

export async function GET(req: NextRequest) {
  let id = req.nextUrl.searchParams.get("id") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";
  try {
    if (!id && name.length >= 3) {
      const sj = await fetch(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(name)}&limit=10&type=player`, { next: { revalidate: 86400 } }).then((r) => r.json());
      const items = (sj?.results ?? []).flatMap((r: { contents?: unknown[] }) => r?.contents ?? []) as { sport?: string; displayName?: string; link?: { web?: string } }[];
      for (const it of items) {
        if ((it.sport ?? "").toLowerCase() !== "soccer" || norm(it.displayName ?? "") !== norm(name)) continue;
        const m = String(it.link?.web ?? "").match(/\/id\/(\d+)/);
        if (m) { id = m[1]; break; }
      }
    }
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });

    const base = await fetch(`${BASE}/athletes/${id}/stats`, { next: { revalidate: 86400 } }).then((r) => r.json());
    const teamOpts: Opt[] = base?.filters?.find((f: { name: string }) => f.name === "team")?.options ?? [];
    let labels: string[] = [];
    const seasons: { season: string; team: string; league: string; stats: (string | number)[]; sortKey: string }[] = [];
    for (const t of teamOpts.slice(0, 12)) {
      const tj = await fetch(`${BASE}/athletes/${id}/stats?team=${t.value}`, { next: { revalidate: 86400 } }).then((r) => r.json()).catch(() => null);
      const leagueOpts: Opt[] = tj?.filters?.find((f: { name: string }) => f.name === "league")?.options ?? [];
      for (const lg of leagueOpts) {
        const lj = lg.value === tj?.filters?.find((f: { name: string }) => f.name === "league")?.value
          ? tj
          : await fetch(`${BASE}/athletes/${id}/stats?team=${t.value}&league=${lg.value}`, { next: { revalidate: 86400 } }).then((r) => r.json()).catch(() => null);
        const cat = lj?.categories?.find((c: { name?: string }) => c.name === "offensive") ?? lj?.categories?.[0];
        if (!cat) continue;
        if (labels.length === 0) labels = cat.labels ?? cat.names ?? [];
        for (const s of cat.statistics ?? []) {
          const yr = s.season?.displayName ?? String(s.season?.year ?? "");
          seasons.push({ season: yr, team: t.displayValue, league: lg.displayValue, stats: s.stats ?? [], sortKey: `${s.season?.year ?? yr}` });
        }
      }
    }
    seasons.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const totals = labels.map((_, i) => seasons.reduce((sum, s) => sum + (parseFloat(String(s.stats[i]).replace(/,/g, "")) || 0), 0));
    const ov = await fetch(`${BASE}/athletes/${id}`, { next: { revalidate: 86400 } }).then((r) => r.json()).catch(() => null);
    const a = ov?.athlete ?? {};
    return NextResponse.json({
      espnId: id,
      profile: {
        name: a.displayName ?? name, position: a.position?.displayName ?? null, team: a.team?.displayName ?? null,
        nationality: a.citizenship ?? a.flag?.alt ?? null, born: a.displayDOB ?? null, height: a.displayHeight ?? null,
        headshot: a.headshot?.href ?? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`,
      },
      categories: seasons.length ? [{
        name: "Career", labels: ["League", ...labels],
        seasons: seasons.map((s) => ({ season: s.season, team: s.team, stats: [s.league, ...s.stats] })),
        totals: ["", ...totals],
      }] : [],
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}