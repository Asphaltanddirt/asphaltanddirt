import { NextRequest, NextResponse } from "next/server";
import { runNotifications } from "@/lib/notify";

export const maxDuration = 60;

/**
 * The posting nudges. Runs every 10 minutes — not 15 — because every window on
 * the board opens on a ten-minute boundary (10:00, 12:00, 12:30, 1:00, 2:00,
 * 6:00, 7:00), so "ten minutes before" lands exactly. A 15-minute poll would
 * drift up to 15 minutes late.
 *
 * A poll rather than fixed cron entries because the TikTok timing test rotates
 * its four slots between 1 PM and 7 PM every week; a hardcoded schedule would
 * need editing weekly.
 *
 * `?force=1` ignores the Garage Settings switch.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_API_SECRET;
  const ok = (cron && auth === `Bearer ${cron}`) || (admin && (auth === `Bearer ${admin}` || key === admin)) || (!cron && !admin);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await runNotifications({ force: req.nextUrl.searchParams.get("force") === "1" });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("notify cron failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Notify failed." }, { status: 500 });
  }
}
