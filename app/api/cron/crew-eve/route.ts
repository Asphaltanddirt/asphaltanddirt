import { NextRequest, NextResponse } from "next/server";
import { runCrewEve } from "@/lib/crewEve";

export const maxDuration = 60;

/**
 * The night-before email to the crew going tomorrow + the owners' shot list
 * (lib/crewEve.ts). Daily at 23:00 UTC: 7 PM Eastern in summer, 6 PM in
 * winter, so it always lands after the 6 PM send-from hour.
 *
 * `?dry=1` lists who would get what without sending. `?force=1` ignores the
 * hour (for a manual run).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_API_SECRET;
  const ok = (cron && auth === `Bearer ${cron}`) || (admin && (auth === `Bearer ${admin}` || key === admin)) || (!cron && !admin);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await runCrewEve({
      dry: req.nextUrl.searchParams.get("dry") === "1",
      force: req.nextUrl.searchParams.get("force") === "1",
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("crew-eve cron failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Crew eve failed." }, { status: 500 });
  }
}
