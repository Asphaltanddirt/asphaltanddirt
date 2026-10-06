import { NextRequest, NextResponse } from "next/server";
import { slotStart } from "@/lib/autoPost";
import { attachTrailTalkImages, closeScheduledPosts, flipGoPublicVideos, generateSocialWeek } from "@/lib/garageSocial";
import { generateWeek, todayNY, weekOf } from "@/lib/garageTasks";
import { matchPostedMedia } from "@/lib/mediaUsage";
import { addOffBoardPosts, syncSocialStatsFromMeta, syncSocialStatsFromThreads, syncSocialStatsFromX } from "@/lib/socialStatsSync";
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
  // ?stats=meta-dry: what the Meta sync would fill right now, writing nothing
  // and skipping the rest of the run (checking the card matching, 10/1).
  if (new URL(req.url).searchParams.get("stats") === "meta-dry") {
    return NextResponse.json(await syncSocialStatsFromMeta(new Date(), { dryRun: true }).catch((err) => ({ ok: false, error: String(err) })));
  }
  // ?stats=offboard-dry[&days=N]: which IG/FB posts have no board card,
  // writing nothing and skipping the rest of the run.
  if (new URL(req.url).searchParams.get("stats") === "offboard-dry") {
    const days = Number(new URL(req.url).searchParams.get("days")) || undefined;
    return NextResponse.json(await addOffBoardPosts(new Date(), { dryRun: true, days }).catch((err) => ({ ok: false, error: String(err) })));
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
    // The week's Trail Talk image onto every Trail Talk card (X, Threads, FB
    // Group) once it exists, so the by-hand group card has it to save.
    const trailTalkImages = await attachTrailTalkImages([weekOf(todayNY()), weekOf(nextWeek)]).catch((err) => {
      console.error("trail talk images failed", err);
      return 0;
    });
    // Unlisted videos whose YouTube card is ticked Go Public go Public at
    // their slot (this run is 7 AM ET). Never blocks the rest.
    const wentPublic = await flipGoPublicVideos(slotStart).catch((err) => [`failed: ${String(err)}`]);
    // Scheduled by-hand cards that have their link close themselves after
    // their slot (Jose 10/3), before the stats sync looks for Posted cards.
    const scheduledClosed = await closeScheduledPosts(slotStart).catch((err) => {
      console.error("closing scheduled posts failed", err);
      return 0;
    });
    // Fill the board's 7-day numbers (Meta + X + Threads). Mondays only, so
    // Garage → Numbers moves once a week and week over week reads cleanly
    // (Jose 9/28); ?stats=1 pulls an update on request. Failures never block
    // the rest.
    const weekdayNY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(new Date());
    const pullStats = weekdayNY === "Mon" || new URL(req.url).searchParams.get("stats") === "1";
    const skipped = { ok: true, skipped: "Mondays only (add ?stats=1 to pull now)" };
    // IG/FB posts made outside the board get a card first, so the fill below
    // counts them too (Jose 10/5). Never blocks the rest.
    const offBoard = pullStats ? await addOffBoardPosts().catch((err) => ({ ok: false, error: String(err) })) : skipped;
    const [metaStats, xStats, threadsStats] = pullStats
      ? await Promise.all([
          syncSocialStatsFromMeta().catch((err) => ({ ok: false, error: String(err) })),
          syncSocialStatsFromX().catch((err) => ({ ok: false, error: String(err) })),
          syncSocialStatsFromThreads().catch((err) => ({ ok: false, error: String(err) })),
        ])
      : [skipped, skipped, skipped];
    // Stamp Library footage that went out on a card without a Library pick
    // (#7), so the Planning Calendar's footage count stays honest.
    const mediaUsage = await matchPostedMedia({ write: true })
      .then((r) => ({ tagged: r.tagged, unlisted: r.unlisted.length }))
      .catch((err) => ({ error: String(err) }));
    // Touch the Threads token daily so it renews in its last 20 days even in a
    // quiet week (it only refreshes when used).
    const threads = (await isThreadsConnected().catch(() => false)) ? await checkThreadsSetup() : { ok: false, skipped: "not connected" };
    return NextResponse.json({ status: "ok", created: made.length, keys: made, socialCreated: social.length, trailTalkImages, wentPublic, scheduledClosed, offBoard, metaStats, xStats, threadsStats, threads, mediaUsage });
  } catch (err) {
    console.error("garage task generation failed", err);
    return NextResponse.json({ error: "Task generation failed." }, { status: 500 });
  }
}
