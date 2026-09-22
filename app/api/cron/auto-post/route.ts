import { NextRequest, NextResponse } from "next/server";
import { runAutoPoster } from "@/lib/autoPost";

export const maxDuration = 300;

/**
 * The posting board's auto-poster, every 15 minutes. Sends approved posts
 * whose slot has opened, and only while the Control Room's Auto-posting
 * switch is on; otherwise it dry-runs them. `?dry=1` forces a dry run
 * (admin key accepted, for checking by hand).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_API_SECRET;
  const ok = (cron && auth === `Bearer ${cron}`) || (admin && (auth === `Bearer ${admin}` || key === admin)) || (!cron && !admin);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await runAutoPoster({ dryRun: req.nextUrl.searchParams.get("dry") === "1" });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("auto-post run failed", err);
    return NextResponse.json({ error: "Auto-post run failed." }, { status: 500 });
  }
}
