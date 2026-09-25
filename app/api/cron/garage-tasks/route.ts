import { NextRequest, NextResponse } from "next/server";
import { generateWeek } from "@/lib/garageTasks";
import { generateSocialWeek } from "@/lib/garageSocial";
import { syncSocialStatsFromMeta, syncSocialStatsFromThreads, syncSocialStatsFromX } from "@/lib/socialStatsSync";
import { checkThreadsSetup, isThreadsConnected } from "@/lib/threadsPost";

export const maxDuration = 60;

/**
 * Creates the week's Garage tasks from the active templates. Runs every
 * morning rather than only on Monday, so a week is never skipped if a run
 * fails; anything already generated for that week is left alone.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    // This week AND next week. The Planning Calendar plans Tuesday → next
    // Monday and looks 6 days further, so next week's cards and tasks have to
    // exist by Monday morning or the gaps it's there to show can't be seen.
    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const made = [...(await generateWeek()), ...(await generateWeek(nextWeek))];
    // The posting board's weeks, from the Posting Schedule. A failure here
    // never blocks the tasks above.
    const social = await Promise.all([generateSocialWeek(), generateSocialWeek(nextWeek)])
      .then(([a, b]) => [...a, ...b])
      .catch((err) => {
        console.error("social week generation failed", err);
        return [] as string[];
      });
    // Fill the board's 7-day numbers (Meta + X). Daily, so no post skips its
    // 7–10 day window. Failures never block the rest.
    const [metaStats, xStats, threadsStats] = await Promise.all([
      syncSocialStatsFromMeta().catch((err) => ({ ok: false, error: String(err) })),
      syncSocialStatsFromX().catch((err) => ({ ok: false, error: String(err) })),
      syncSocialStatsFromThreads().catch((err) => ({ ok: false, error: String(err) })),
    ]);
    // Touch the Threads token daily so it renews in its last 20 days even in a
    // quiet week (it only refreshes when used).
    const threads = (await isThreadsConnected().catch(() => false)) ? await checkThreadsSetup() : { ok: false, skipped: "not connected" };
    return NextResponse.json({ status: "ok", created: made.length, keys: made, socialCreated: social.length, metaStats, xStats, threadsStats, threads });
  } catch (err) {
    console.error("garage task generation failed", err);
    return NextResponse.json({ error: "Task generation failed." }, { status: 500 });
  }
}
