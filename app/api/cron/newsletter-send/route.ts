import { NextRequest, NextResponse } from "next/server";
import { getDraftIssue, sentToday, setScheduled } from "@/lib/newsletterIssue";
import { sendDraftDigest } from "@/lib/weeklyDigestSend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Thursday 7 PM (New York) live send of The Dirt Line, so nobody's laptop
 * has to be on (Jose 10/15). Sends the newest Draft row only if its
 * "Send Thu 7 PM" box is ticked (Garage → Newsletter → Send Thursday 7 PM).
 *
 * vercel.json runs this at 23:00 and 00:00 UTC on Thu + Fri; only the run
 * that lands on Thursday 7 PM New York time does anything, so it stays at
 * 7 PM through both daylight and standard time.
 *
 * Never sends twice: it unticks the box BEFORE sending (a failed send stays
 * unticked, to be resent by hand), and skips if an issue already went out
 * today.
 *
 *   ?dry=1   report what it would do, change nothing (any day, any hour)
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts
 * `ADMIN_API_SECRET` for manual runs.
 */
function nyNow(): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  return {
    weekday: parts.find((p) => p.type === "weekday")?.value || "",
    hour: Number(parts.find((p) => p.type === "hour")?.value),
  };
}

async function run(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  const ok = (cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const now = nyNow();
  const isSendTime = now.weekday === "Thu" && now.hour === 19;

  try {
    const draft = await getDraftIssue();
    const already = await sentToday();
    const wouldSend = Boolean(draft?.scheduled) && !already;

    if (dry) {
      return NextResponse.json({
        status: "dry",
        nyTime: now,
        isSendTime,
        draft: draft ? { id: draft.recordId, weekOf: draft.weekOf, scheduled: draft.scheduled } : null,
        sentToday: already,
        wouldSendAtSevenPm: wouldSend,
      });
    }
    if (!isSendTime) return NextResponse.json({ status: "ok", skipped: "not Thursday 7 PM in New York" });
    if (!draft) return NextResponse.json({ status: "ok", skipped: "no Draft issue" });
    if (!draft.scheduled) return NextResponse.json({ status: "ok", skipped: "Send Thu 7 PM not ticked" });
    if (already) return NextResponse.json({ status: "ok", skipped: "an issue already went out today" });

    // Claim it first: whatever happens next, this row won't send again on its own.
    await setScheduled(draft.recordId, false);
    const result = await sendDraftDigest("live", draft);
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("newsletter-send cron error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed." }, { status: 502 });
  }
}

export const GET = run;
