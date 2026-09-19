import { NextRequest, NextResponse } from "next/server";
import { getPopularGames, getPopularEntities, type Kind } from "@/lib/popular";

export async function GET(req: NextRequest) {
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));
  const kind = (req.nextUrl.searchParams.get("kind") ?? "games") as Kind;
  const games = kind === "games" ? await getPopularGames(10, days) : await getPopularEntities(kind, 10, days);
  return NextResponse.json({ games });
}