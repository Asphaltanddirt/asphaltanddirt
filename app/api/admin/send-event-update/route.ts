import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, listRsvpsForEvent } from "@/lib/events";
import { buildRsvpUpdate } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";

/**
 * Sends a one-off update ("meetup spot moved," "cancelled," "bring tire
 * chains") to everyone who RSVP'd to one event. Manual/on-demand — events
 * are infrequent enough that a cron isn't worth it.
 *
 *   POST /api/admin/send-event-update
 *   Auth: Authorization: Bearer <ADMIN_API_SECRET>
 *   Body: { "slug": "<event-slug>", "message": "...", "mode": "test" | "live" }
 *
 *   mode "test" (default) — one copy to NEWSLETTER_TEST_EMAIL.
 *   mode "live" — one copy to every Confirmed RSVP for that event.
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { slug?: string; message?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const message = body.message?.trim();
  const mode = body.mode === "live" ? "live" : "test";
  if (!slug || !message) {
    return NextResponse.json({ error: "slug and message are required" }, { status: 400 });
  }

  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: `No published event found for slug "${slug}".` }, { status: 404 });
  }

  if (mode === "test") {
    const testEmail = process.env.NEWSLETTER_TEST_EMAIL;
    if (!testEmail) {
      return NextResponse.json({ error: "Set NEWSLETTER_TEST_EMAIL to run a test send." }, { status: 400 });
    }
    const built = buildRsvpUpdate({ recipientName: "there", event, message });
    await sendEmail({ to: testEmail, subject: `[TEST] ${built.subject}`, html: built.html });
    return NextResponse.json({ mode, event: { slug: event.slug, title: event.title }, recipients: 1, sent: 1, failed: 0 });
  }

  const recipients = await listRsvpsForEvent(event.id);
  if (recipients.length === 0) {
    return NextResponse.json({
      mode,
      event: { slug: event.slug, title: event.title },
      recipients: 0,
      sent: 0,
      failed: 0,
      skipped: "no RSVPs for this event",
    });
  }

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      const built = buildRsvpUpdate({ recipientName: r.name, event, message });
      await sendEmail({ to: r.email, subject: built.subject, html: built.html });
      sent++;
    } catch (err) {
      console.error("Event update send failed for", r.email, err);
      failed++;
    }
  }

  return NextResponse.json({ mode, event: { slug: event.slug, title: event.title }, recipients: recipients.length, sent, failed });
}
