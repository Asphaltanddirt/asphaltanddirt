import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, listRsvpsForEvent } from "@/lib/events";
import { getSettingsDueForReminder, getSettingsToClose, markActivated, markClosedEmailSent, getAttendeeRoster } from "@/lib/eventComms";
import { buildWaiverInvite, buildCommsClosing } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEAM_EMAIL = process.env.EVENT_COMMS_TEAM_EMAIL || "team@asphaltanddirt.com";

/**
 * Hourly (not daily — each event's send time is computed from its own
 * Event End Time, see lib/eventComms.ts reminderSendTime, so a fixed daily
 * slot can't hit every event's target). Two independent sweeps:
 *
 *  1. Reminder: events whose computed send time has passed and haven't
 *     been activated yet — opens the 48h/24h windows (Activated At) and
 *     emails the *waiver* link (not the chat directly) to every RSVP, plus
 *     one team-inbox copy to paste into the FB group.
 *  2. Closing: events whose 48h chat window has elapsed and haven't had
 *     their closing email sent — emails every registered attendee (people
 *     who actually signed the waiver, not just RSVP'd) a thanks + link to
 *     the recap/gallery page.
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

  const now = new Date();

  // --- Sweep 1: reminders (opens the windows) ---
  const dueForReminder = await getSettingsDueForReminder(now);
  const reminders = [];

  for (const settings of dueForReminder) {
    const event = await getEventBySlug(settings.eventSlug);
    if (!event) {
      reminders.push({ slug: settings.eventSlug, error: "No published event found for this slug — check Event Settings." });
      continue;
    }

    const waiverUrl = `${SITE_URL}/comms/${settings.eventSlug}/waiver`;
    const recipients = await listRsvpsForEvent(event.id);

    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      try {
        const built = buildWaiverInvite({ recipientName: r.name, event, waiverUrl });
        await sendEmail({ to: r.email, subject: built.subject, html: built.html });
        sent++;
      } catch (err) {
        console.error("Waiver invite send failed for", r.email, err);
        failed++;
      }
    }

    // One copy to the team inbox — not a real RSVP, just content to paste into the FB group.
    try {
      const teamCopy = buildWaiverInvite({ recipientName: "Team", event, waiverUrl });
      await sendEmail({ to: TEAM_EMAIL, subject: `[Team copy] ${teamCopy.subject}`, html: teamCopy.html });
    } catch (err) {
      console.error("Waiver invite team copy failed", err);
    }

    await markActivated(settings.id);
    reminders.push({ slug: settings.eventSlug, title: event.title, recipients: recipients.length, sent, failed });
  }

  // --- Sweep 2: closing emails (48h window elapsed) ---
  const dueToClose = await getSettingsToClose(now);
  const closings = [];

  for (const settings of dueToClose) {
    const event = await getEventBySlug(settings.eventSlug);
    if (!event) {
      closings.push({ slug: settings.eventSlug, error: "No published event found for this slug." });
      continue;
    }

    const recapUrl = `${SITE_URL}/events/${settings.eventSlug}`;
    const attendees = await getAttendeeRoster(settings.eventSlug);

    let sent = 0;
    let failed = 0;
    for (const a of attendees) {
      if (!a.email) continue;
      try {
        const built = buildCommsClosing({ recipientName: a.screenName, event, recapUrl });
        await sendEmail({ to: a.email, subject: built.subject, html: built.html });
        sent++;
      } catch (err) {
        console.error("Comms closing send failed for", a.email, err);
        failed++;
      }
    }

    await markClosedEmailSent(settings.id);
    closings.push({ slug: settings.eventSlug, title: event.title, attendees: attendees.length, sent, failed });
  }

  return NextResponse.json({ status: "ok", ranAt: now.toISOString(), reminders, closings });
}

export async function GET(req: NextRequest) {
  return run(req);
}
