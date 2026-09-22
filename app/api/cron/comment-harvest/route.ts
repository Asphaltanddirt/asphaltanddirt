import { NextRequest, NextResponse } from "next/server";
import { checkHarvestSetup, harvestComments } from "@/lib/commentHarvest";

export const maxDuration = 60;

/**
 * Weekly comment pull (Mondays, 9 AM Eastern on daylight time) into
 * Garage → Comments. `?check=1` reports whether it can run, `?force=1` ignores
 * the Garage Settings switch.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_API_SECRET;
  const ok = (cron && auth === `Bearer ${cron}`) || (admin && (auth === `Bearer ${admin}` || key === admin)) || (!cron && !admin);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (req.nextUrl.searchParams.get("check") === "1") {
    return NextResponse.json({ status: "ok", check: await checkHarvestSetup() });
  }

  try {
    const result = await harvestComments({ force: req.nextUrl.searchParams.get("force") === "1" });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("comment harvest failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Comment harvest failed." }, { status: 500 });
  }
}
