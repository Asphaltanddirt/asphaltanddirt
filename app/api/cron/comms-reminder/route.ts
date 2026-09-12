import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, listRsvpsForEvent } from "@/lib/events";
import { getSettingsToActivate, markActivated } from "@/lib/eventComms";
import { buildCommsReminder } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEAM_EMAIL = process.env.EVENT_COMMS_TEAM_EMAIL || "team@asphaltanddirt.com";

/**
 * Daily: finds every event happening tomorrow with an Event Comms
 * "Event Settings" row (Active, not yet activated), opens its chat
 * (stamps Activated At — open for the next 48 hours, see
 * lib/eventComms.ts isCommsOpen), and emails the comms link to every RSVP
 * plus one copy to the team inbox to paste into the FB group.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts
 * `ADMIN_API_SECRET` for manual runs. Schedule is in vercel.json.
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

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const settingsToActivate = await getSettingsToActivate(tomorrowStr);
  const results = [];

  for (const settings of settingsToActivate) {
    const event = await getEventBySlug(settings.eventSlug);
    if (!event) {
      results.push({ slug: settings.eventSlug, error: "No published event found for this slug — check Event Settings." });
      continue;
    }

    const commsUrl = `${SITE_URL}/comms/${settings.eventSlug}`;
    const recipients = await listRsvpsForEvent(event.id);

    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      try {
        const built = buildCommsReminder({ recipientName: r.name, event, commsUrl });
        await sendEmail({ to: r.email, subject: built.subject, html: built.html });
        sent++;
      } catch (err) {
        console.error("Comms reminder send failed for", r.email, err);
        failed++;
      }
    }

    // One copy to the team inbox — not a real RSVP, just content to paste into the FB group.
    try {
      const teamCopy = buildCommsReminder({ recipientName: "Team", event, commsUrl });
      await sendEmail({ to: TEAM_EMAIL, subject: `[Team copy] ${teamCopy.subject}`, html: teamCopy.html });
    } catch (err) {
      console.error("Comms reminder team copy failed", err);
    }

    await markActivated(settings.id);
    results.push({ slug: settings.eventSlug, title: event.title, recipients: recipients.length, sent, failed });
  }

  return NextResponse.json({ status: "ok", date: tomorrowStr, events: results });
}

export async function GET(req: NextRequest) {
  return run(req);
}
