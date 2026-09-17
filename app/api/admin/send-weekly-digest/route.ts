import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigest } from "@/lib/newsletter";
import { sendNewsletter } from "@/lib/newsletterSend";
import { NoDraftIssueError, sendDraftDigest } from "@/lib/weeklyDigestSend";
import type { WeeklyDigestOptions } from "@/lib/newsletter";

/**
 * Sends the weekly digest — feature story, build spotlight, gear verdict,
 * what's coming up, quick hits, closing community CTA — auto-assembled
 * from live site data, over the Airtable subscriber list via Resend.
 *
 *   ?from=airtable   pull Trail Talk / Rig of the Week from the newest
 *                    Draft row in the Newsletters table, and (on a live
 *                    send) stamp that row with the archive fields.
 *   ?mode=test       (default) one copy to NEWSLETTER_TEST_EMAIL
 *   ?mode=live       personalized copy to every Active subscriber
 *
 * Without ?from=airtable, the POST body supplies the sections directly:
 *   { "trailTalk": {...}, "rigOfTheWeek": {...} }  (both optional)
 *
 * Preview the layout first at GET /api/admin/preview-weekly-digest.
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") === "live" ? "live" : "test";
  const fromAirtable = req.nextUrl.searchParams.get("from") === "airtable";

  // Newest Draft row: the shared path the Garage Newsletter screen uses too.
  if (fromAirtable) {
    try {
      return NextResponse.json(await sendDraftDigest(mode));
    } catch (err) {
      if (err instanceof NoDraftIssueError) return NextResponse.json({ error: err.message }, { status: 404 });
      console.error("send-weekly-digest error", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed." }, { status: 502 });
    }
  }

  let options: WeeklyDigestOptions = {};
  try {
    const body = await req.text();
    if (body) options = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const content = await buildWeeklyDigest(options);
    const result = await sendNewsletter(content, mode);

    return NextResponse.json({ subject: content.subject, ...result });
  } catch (err) {
    console.error("send-weekly-digest error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 502 },
    );
  }
}
