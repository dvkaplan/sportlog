import { NextRequest, NextResponse } from "next/server";
import { getPopularGames } from "@/lib/popular";

export async function GET(req: NextRequest) {
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));
  return NextResponse.json({ games: await getPopularGames(10, days) });
}