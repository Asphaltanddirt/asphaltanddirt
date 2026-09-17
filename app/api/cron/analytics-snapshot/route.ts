import { NextRequest, NextResponse } from "next/server";
import { isAirtableConfigured } from "@/lib/airtable";
import { runAnalyticsSnapshot } from "@/lib/analyticsSnapshot";
import { syncSocialStatsFromMeta } from "@/lib/socialStatsSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly: pulls the analytics we can get — Fourthwall merch totals, YouTube
 * public stats (subscribers, per-video lifetime views, channel views, upload
 * count), Vercel/Search Console, and Meta (Instagram + Facebook Page) — into
 * the "A&D Analytics" Airtable base. Then fills the posting board's 7-day
 * numbers for any Instagram/Facebook post that has just aged into its window.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts
 * `ADMIN_API_SECRET` for manual runs. Schedule is in vercel.json (Mondays).
 * `?dry=1` runs the pull and reports what it would write without writing.
 */
async function run(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  const ok = (cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const baseId = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
  if (!isAirtableConfigured(baseId)) {
    return NextResponse.json({ error: "Airtable is not configured for the Analytics base." }, { status: 500 });
  }

  // `?dry=1` reads the source APIs and reports what it would write, without writing.
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  try {
    const now = new Date();
    const result = await runAnalyticsSnapshot(now, { dryRun: dry });
    // Board numbers are a separate write, and never a reason to fail the run.
    let socialStats;
    if (!dry) {
      try {
        socialStats = await syncSocialStatsFromMeta(now);
      } catch (e) {
        socialStats = { ok: false, error: String(e) };
      }
    }
    return NextResponse.json({ status: "ok", result, socialStats });
  } catch (err) {
    console.error("analytics-snapshot cron error", err);
    return NextResponse.json({ error: "Snapshot failed.", detail: String(err) }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
