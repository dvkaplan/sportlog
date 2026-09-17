import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-server";

export async function cachedResponse(key: string, ttlDays: number, run: () => Promise<Response>) {
  try {
    const { data } = await supabaseAdmin.from("wiki_cache").select("payload, fetched_at").eq("key", key).maybeSingle();
    if (data && Date.now() - new Date(data.fetched_at).getTime() < ttlDays * 86400000) {
      const p = data.payload as { status: number; body: unknown };
      return NextResponse.json(p.body, { status: p.status });
    }
  } catch { /* cache unavailable — fall through to live */ }
  const res = await run();
  const status = res.status;
  const body = await res.json().catch(() => ({ error: "unavailable" }));
  if (status !== 502) {
    try { await supabaseAdmin.from("wiki_cache").upsert({ key, payload: { status, body }, fetched_at: new Date().toISOString() }); } catch { /* best effort */ }
  }
  return NextResponse.json(body, { status });
}