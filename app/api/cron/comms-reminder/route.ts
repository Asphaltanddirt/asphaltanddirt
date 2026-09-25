import { NextRequest, NextResponse } from "next/server";
import { feedbackUrl } from "@/lib/eventFeedback";
import { getEventBySlug, listRsvpsForEvent } from "@/lib/events";
import { getSettingsDueForReminder, getSettingsToClose, markActivated, markClosedEmailSent, getAttendeesForEmail } from "@/lib/eventComms";
import { buildWaiverInvite, buildCommsClosing } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";
import { releaseLink } from "@/lib/rsvpRelease";
import { runAttendeeTrack } from "@/lib/attendeeTrack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEAM_EMAIL = process.env.EVENT_COMMS_TEAM_EMAIL || "team@asphaltanddirt.com";

/**
 * Hourly: each event opens at 7 PM Eastern the evening before it (see
 * lib/eventComms.ts reminderSendTime), and an hourly sweep catches it within
 * the hour whatever the season's UTC offset. Three independent sweeps:
 *
 *  1. Reminder: events whose computed send time has passed and haven't
 *     been activated yet — opens the 48h/24h windows (Activated At) and
 *     emails the *waiver* link (not the chat directly) to every RSVP, plus
 *     one team-inbox copy to paste into the FB group.
 *     Each RSVP's copy carries their own "release your spot" link: for
 *     Tailgate events this IS the day-before reminder (lib/attendeeTrack.ts
 *     explains the split).
 *  2. Thank-you: 3 hours after staff taps Trail over (or at the end of the 48h
 *     window if nobody did) — emails every registered attendee (people who
 *     actually signed the waiver, not just RSVP'd) a thanks + the photo and
 *     video upload link, which never expires.
 *  3. Attendee track: the D−3 plan email to every site RSVP, and the D−1
 *     reminder with "release your spot" for events without Tailgate
 *     (lib/attendeeTrack.ts). Once per RSVP, from 10 AM New York time.
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
        const built = buildWaiverInvite({ recipientName: r.name, event, waiverUrl, releaseUrl: releaseLink(event.slug, r.id, event.date) });
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

    await markActivated(settings);
    reminders.push({ slug: settings.eventSlug, title: event.title, recipients: recipients.length, sent, failed });
  }

  // --- Sweep 2: thank-you emails (Trail over + 3h, or the 48h window elapsed) ---
  const dueToClose = await getSettingsToClose(now);
  const closings = [];

  for (const settings of dueToClose) {
    const event = await getEventBySlug(settings.eventSlug);
    if (!event) {
      closings.push({ slug: settings.eventSlug, error: "No published event found for this slug." });
      continue;
    }

    const recapUrl = `${SITE_URL}/events/${settings.eventSlug}#photos`;
    const attendees = await getAttendeesForEmail(settings.eventSlug);

    let sent = 0;
    let failed = 0;
    for (const a of attendees) {
      if (!a.email) continue;
      try {
        const built = buildCommsClosing({ recipientName: a.screenName, event, recapUrl, feedbackUrl: feedbackUrl(settings.eventSlug) });
        await sendEmail({ to: a.email, subject: built.subject, html: built.html, replyTo: TEAM_EMAIL });
        sent++;
      } catch (err) {
        console.error("Comms closing send failed for", a.email, err);
        failed++;
      }
    }

    await markClosedEmailSent(settings);
    closings.push({ slug: settings.eventSlug, title: event.title, attendees: attendees.length, sent, failed });
  }

  // --- Sweep 3: the attendee track (D−3 plan email, D−1 reminder for events
  // without Tailgate). Its own failures must not hide the two sweeps above.
  const attendeeTrack = await runAttendeeTrack(now).catch((err) => {
    console.error("attendee track sweep failed", err);
    return [];
  });

  return NextResponse.json({ status: "ok", ranAt: now.toISOString(), reminders, closings, attendeeTrack });
}

export async function GET(req: NextRequest) {
  return run(req);
}
