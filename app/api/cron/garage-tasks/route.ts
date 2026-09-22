import { NextRequest, NextResponse } from "next/server";
import { generateWeek } from "@/lib/garageTasks";
import { generateSocialWeek } from "@/lib/garageSocial";
import { syncSocialStatsFromMeta, syncSocialStatsFromX } from "@/lib/socialStatsSync";

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
    const made = await generateWeek();
    // The posting board's week, from the Posting Schedule. A failure here
    // never blocks the tasks above.
    const social = await generateSocialWeek().catch((err) => {
      console.error("social week generation failed", err);
      return [];
    });
    // Fill the board's 7-day numbers (Meta + X). Daily, so no post skips its
    // 7–10 day window. Failures never block the rest.
    const [metaStats, xStats] = await Promise.all([
      syncSocialStatsFromMeta().catch((err) => ({ ok: false, error: String(err) })),
      syncSocialStatsFromX().catch((err) => ({ ok: false, error: String(err) })),
    ]);
    return NextResponse.json({ status: "ok", created: made.length, keys: made, socialCreated: social.length, metaStats, xStats });
  } catch (err) {
    console.error("garage task generation failed", err);
    return NextResponse.json({ error: "Task generation failed." }, { status: 500 });
  }
}
