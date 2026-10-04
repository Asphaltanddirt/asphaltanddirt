import { NextRequest, NextResponse } from "next/server";
import { isRallyConfigured, runRallySweep } from "@/lib/rally";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily Rally Rewards sweep (lib/rally.ts): event points from check-ins and
 * "I was there" taps, birthdays, store orders/refunds, rank-ups. Runs after
 * the order sync (16:00 UTC) so the day's orders are in. Safe to re-run.
 */
async function run(req: NextRequest) {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("key") || "";
  const ok = (process.env.CRON_SECRET && provided === process.env.CRON_SECRET) || (process.env.ADMIN_API_SECRET && provided === process.env.ADMIN_API_SECRET);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isRallyConfigured()) return NextResponse.json({ error: "Rally Rewards base is not configured." }, { status: 500 });
  try {
    return NextResponse.json({ status: "ok", ...(await runRallySweep()) });
  } catch (err) {
    console.error("rally sweep failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
