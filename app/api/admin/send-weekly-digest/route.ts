import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigest } from "@/lib/newsletter";
import { sendNewsletter } from "@/lib/newsletterSend";
import type { WeeklyDigestOptions } from "@/lib/newsletter";

/**
 * Sends the weekly digest — feature story, build spotlight, gear verdict,
 * what's coming up, quick hits, closing community CTA — auto-assembled
 * from live site data, over the Airtable subscriber list via Resend.
 *
 *   ?mode=test   (default) one copy to NEWSLETTER_TEST_EMAIL
 *   ?mode=live   personalized copy to every Active subscriber
 *
 * POST body (all optional — omit a section if there's no content for it
 * this week):
 *   {
 *     "trailTalk": { "title": "...", "body": "...", "ctaText": "...", "ctaUrl": "..." },
 *     "rigOfTheWeek": { "name": "...", "blurb": "...", "photoUrl": "...", "photoAlt": "...", "ctaUrl": "..." }
 *   }
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
