import { NextRequest, NextResponse } from "next/server";
import { autoPostNow, runAutoPoster } from "@/lib/autoPost";
import { checkMetaSetup } from "@/lib/metaPost";
import { checkXSetup } from "@/lib/xPost";
import { checkThreadsSetup } from "@/lib/threadsPost";

export const maxDuration = 300;

/**
 * The posting board's auto-poster, every 15 minutes. Sends approved posts
 * whose slot has opened, and only while the Control Room's Auto-posting
 * switch is on; otherwise it dry-runs them. `?dry=1` forces a dry run
 * (admin key accepted, for checking by hand). `?check=1` only checks the
 * Meta and X keys — read-only, posts nothing. `?now=<card id>` (admin key)
 * is "Post now" for one card, the same as the button on the board.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_API_SECRET;
  const ok = (cron && auth === `Bearer ${cron}`) || (admin && (auth === `Bearer ${admin}` || key === admin)) || (!cron && !admin);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = req.nextUrl.searchParams.get("now");
  if (now) {
    if (!(admin && (auth === `Bearer ${admin}` || key === admin))) return NextResponse.json({ error: "Admin key required." }, { status: 401 });
    const outcome = await autoPostNow(now);
    return outcome ? NextResponse.json({ status: "ok", ...outcome }) : NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (req.nextUrl.searchParams.get("check") === "1") {
    const [meta, x, threads] = await Promise.all([checkMetaSetup(), checkXSetup(), checkThreadsSetup()]);
    return NextResponse.json({ meta, x, threads });
  }

  try {
    const result = await runAutoPoster({ dryRun: req.nextUrl.searchParams.get("dry") === "1" });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("auto-post run failed", err);
    return NextResponse.json({ error: "Auto-post run failed." }, { status: 500 });
  }
}
