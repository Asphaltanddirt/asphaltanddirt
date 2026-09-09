import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigest, wrapNewsletterEmail } from "@/lib/newsletter";
import { sendNewsletter } from "@/lib/newsletterSend";
import { getDraftIssue, archiveIssue } from "@/lib/newsletterIssue";
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

  let options: WeeklyDigestOptions = {};
  let issueRecordId: string | null = null;

  if (fromAirtable) {
    try {
      const draft = await getDraftIssue();
      if (!draft) {
        return NextResponse.json(
          { error: "No Draft row in the Newsletters table. Create one (Status = Draft) first." },
          { status: 404 },
        );
      }
      options = draft.options;
      issueRecordId = draft.recordId;
    } catch (err) {
      console.error("send-weekly-digest: draft lookup failed", err);
      return NextResponse.json({ error: "Couldn't read the Newsletters table." }, { status: 502 });
    }
  } else {
    try {
      const body = await req.text();
      if (body) options = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }

  try {
    const content = await buildWeeklyDigest(options);
    const result = await sendNewsletter(content, mode);

    // Archive back to the Newsletters row only on a real send that landed.
    if (issueRecordId && mode === "live" && result.sent > 0) {
      const archiveHtml = wrapNewsletterEmail(content, {
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://asphaltanddirt.com"}/api/newsletter/unsubscribe`,
        mailingAddress: process.env.NEWSLETTER_MAILING_ADDRESS || "",
      });
      try {
        await archiveIssue(issueRecordId, {
          subject: content.subject,
          html: archiveHtml,
          recipients: result.sent,
        });
      } catch (err) {
        console.error("send-weekly-digest: archive write failed (email already sent)", err);
      }
    }

    return NextResponse.json({ subject: content.subject, issueRecordId, ...result });
  } catch (err) {
    console.error("send-weekly-digest error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 502 },
    );
  }
}
