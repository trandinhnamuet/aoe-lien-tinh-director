import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveMatchResult } from "@/lib/match-result";
import type { MatchStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Save a single match result. A route handler (returns JSON) rather than a
 * Server Action, so saving does NOT trigger a full-page RSC re-render on every
 * +/- click — the results client updates its counters locally. This is what
 * keeps bulk result entry fast.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { matchId, s1, s2, status, m1, m2, durationSeconds } = body as {
      matchId: string; s1: number; s2: number; status: MatchStatus; m1: number | null; m2: number | null; durationSeconds: number | null;
    };
    if (!matchId) return Response.json({ ok: false, error: "Thiếu matchId" }, { status: 400 });
    const finalStatus = await saveMatchResult(matchId, s1, s2, status, m1 ?? null, m2 ?? null, durationSeconds ?? null);
    return Response.json({ ok: true, status: finalStatus });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Có lỗi xảy ra" }, { status: 400 });
  }
}
