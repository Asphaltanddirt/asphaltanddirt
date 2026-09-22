import { NextRequest, NextResponse } from "next/server";
import { runReplySearch, type ReplyRun } from "@/lib/replyQueue";

export const maxDuration = 60;

/**
 * Twice-daily X search that fills Garage → Replies (8 AM and 6:30 PM Eastern
 * while on daylight time). Respects the "Reply search" switch in Garage
 * Settings. `?run=Evening · dirt` etc. and `&force=1` for a manual run.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_API_SECRET;
  const ok = (cron && auth === `Bearer ${cron}`) || (admin && (auth === `Bearer ${admin}` || key === admin)) || (!cron && !admin);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const run = req.nextUrl.searchParams.get("run") as ReplyRun | null;
  try {
    const result = await runReplySearch({ run: run || undefined, force: req.nextUrl.searchParams.get("force") === "1" });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("reply search failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reply search failed." }, { status: 500 });
  }
}
