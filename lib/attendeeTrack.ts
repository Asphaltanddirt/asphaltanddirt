import { getCommsSettings } from "@/lib/eventComms";
import { buildCommsClosing, buildDayBeforeReminder, buildPlanEmail } from "@/lib/eventEmails";
import { rallyLive, RALLY_START } from "@/lib/rally";
import { wasThereLink } from "@/lib/rallyAuth";
import { feedbackUrl } from "@/lib/eventFeedback";
import { SITE_URL } from "@/lib/site";
import { getLiveEventsOn, listRsvpsForAttendeeTrack, stampRsvp, type EventDetail } from "@/lib/events";
import { todayNY } from "@/lib/garageTasks";
import { sendEmail } from "@/lib/resendEmail";
import { releaseLink } from "@/lib/rsvpRelease";
import { alreadySent, ledgerKey, record } from "@/lib/notify";

/**
 * The attendee track (event promo countdown, 2026-09-24): what a site RSVP
 * gets between the confirmation and the day. Public promo and attendee email
 * are two different jobs; once someone has RSVP'd we stop selling to them and
 * send logistics.
 *
 *   RSVP        → confirmation (the RSVP route, unchanged)
 *   D−3, 10 AM  → the plan: where and when, gear, weather, waiver, who's with you
 *   D−1         → reminder with a "release your spot" link
 *
 * THE SPLIT WITH TAILGATE. Events with a Tailgate row already get a
 * day-before email: the comms-reminder cron sends the waiver invite to every
 * RSVP about 22 hours before the end time. That email IS the D−1 reminder for
 * those events, and it now carries the release link. This file only sends its
 * own D−1 for events with no active Tailgate row, so nobody gets two "see you
 * tomorrow" emails. The D−3 plan email has no Tailgate twin, so every event
 * gets it; for Tailgate events it says the waiver link is coming.
 *
 * Runs from the hourly comms-reminder cron. Each email is sent once per RSVP:
 * the row is stamped BEFORE the send (the same "claim it first" the
 * auto-poster uses), so an overlapping run or a retry can't send it twice. If
 * the stamp can't be written (the field isn't in Airtable yet) nothing is
 * sent, which fails quiet rather than sending every hour.
 */

/** Not before 10 AM New York time on the day: a plan email at 1 AM reads as spam. */
const SEND_FROM_HOUR = 10;

/** The plan email's whole point is where to meet. With Meetup Point blank on
 *  D−3 it waits (Jose gets an alert) until this hour, then goes anyway so
 *  nobody is left with no plan at all (9/28 readiness pass). */
const MEETUP_HOLD_UNTIL_HOUR = 18;
const TEAM_EMAIL = process.env.EVENT_COMMS_TEAM_EMAIL || "team@asphaltanddirt.com";

/** One email per event per day: "Meetup Point is blank". */
async function alertMissingMeetup(event: EventDetail, when: "tomorrow" | "today"): Promise<void> {
  const key = ledgerKey("Missing meetup", event.id, todayNY());
  if (await alreadySent(key)) return;
  const subject = `Meetup Point is blank: ${event.title.trim()}`;
  const html = `<p>The 3-days-before plan email for <strong>${event.title.trim()}</strong> ${
    when === "tomorrow" ? "goes out tomorrow from 10 AM" : "is due today and is on hold"
  }, and the event has no <strong>Meetup Point</strong> yet.</p><p>Fill it in: Garage → Events → ${event.title.trim()} → Edit event. ${
    when === "today" ? `The email waits until ${MEETUP_HOLD_UNTIL_HOUR - 12} PM, then goes without a location.` : ""
  }</p>`;
  try {
    await sendEmail({ to: TEAM_EMAIL, subject, html });
    await record(key, "Missing meetup", subject, "email", "sent", event.slug);
  } catch (err) {
    console.error("missing-meetup alert failed", event.slug, err);
  }
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function hourNY(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
}

export interface AttendeeTrackResult {
  slug: string;
  email: "plan" | "reminder" | "thanks";
  sent: number;
  failed: number;
  skippedNoStamp: number;
  /** Set when the plan email was held for a blank Meetup Point. */
  held?: string;
}

async function sendOnce(
  rsvpId: string,
  field: "Plan Email Sent" | "Reminder Sent" | "Thank You Sent",
  send: () => Promise<void>,
): Promise<"sent" | "failed" | "no-stamp"> {
  try {
    await stampRsvp(rsvpId, field);
  } catch (err) {
    console.error(`attendee track: couldn't stamp ${field}; not sending`, rsvpId, err);
    return "no-stamp";
  }
  try {
    await send();
    return "sent";
  } catch (err) {
    // Not retried: the stamp stays, so a failed send is a missed email, never
    // a duplicate. The count shows up in the cron's response.
    console.error(`attendee track: ${field} send failed`, rsvpId, err);
    return "failed";
  }
}

async function runForEvent(event: EventDetail, kind: "plan" | "reminder" | "thanks", now: Date): Promise<AttendeeTrackResult> {
  const result: AttendeeTrackResult = { slug: event.slug, email: kind, sent: 0, failed: 0, skippedNoStamp: 0 };
  const settings = await getCommsSettings(event.slug).catch(() => null);
  const hasTailgate = Boolean(settings?.active);
  // Tailgate's own day-before email covers D−1 for this event (see top).
  if (kind === "reminder" && hasTailgate) return result;
  // Tailgate events thank their Tailgate sign-ups 3 h after Trail over; this is
  // the same email for events without Tailgate (a pop-up, a meet), to everyone
  // who RSVP'd, the morning after (Jose 9/25: they take photos too).
  if (kind === "thanks" && hasTailgate) return result;

  if (kind === "plan" && !event.meetupPoint.trim()) {
    await alertMissingMeetup(event, "today");
    if (hourNY(now) < MEETUP_HOLD_UNTIL_HOUR) return { ...result, held: "Meetup Point is blank" };
  }

  const rsvps = await listRsvpsForAttendeeTrack(event.id);
  for (const r of rsvps) {
    if (kind === "plan" ? r.planSentAt : kind === "reminder" ? r.reminderSentAt : r.thankYouSentAt) continue;
    const field = kind === "plan" ? "Plan Email Sent" : kind === "reminder" ? "Reminder Sent" : "Thank You Sent";
    const outcome = await sendOnce(r.id, field, async () => {
      const built =
        kind === "plan"
          ? buildPlanEmail({ recipientName: r.name, event, hasTailgate })
          : kind === "reminder"
            ? buildDayBeforeReminder({ recipientName: r.name, event, releaseUrl: releaseLink(event.slug, r.id, event.date) })
            : buildCommsClosing({
                recipientName: r.name,
                event,
                recapUrl: `${SITE_URL}/events/${event.slug}#photos`,
                feedbackUrl: feedbackUrl(event.slug),
                // No Tailgate check-in here, so riders confirm with one tap.
                rally: rallyLive() && event.date >= RALLY_START ? { wasThereUrl: wasThereLink(event.slug, r.id) } : undefined,
              });
      await sendEmail({
        to: r.email,
        subject: built.subject,
        html: built.html,
        ...(kind === "thanks" ? { replyTo: "team@asphaltanddirt.com" } : {}),
      });
    });
    if (outcome === "sent") result.sent++;
    else if (outcome === "failed") result.failed++;
    else {
      result.skippedNoStamp++;
      // One missing field means every row will fail the same way; stop asking.
      break;
    }
  }
  return result;
}

/** The hourly sweep. Only sends on the exact day (D−3 or D−1): an RSVP made
 *  on D−2 already has everything in its confirmation, so nothing is backfilled. */
export async function runAttendeeTrack(now = new Date()): Promise<AttendeeTrackResult[]> {
  if (hourNY(now) < SEND_FROM_HOUR) return [];
  const today = todayNY();
  const planDay = addDays(today, 3);
  const reminderDay = addDays(today, 1);
  // Yesterday's events only, never older: nothing is backfilled to past events.
  const thanksDay = addDays(today, -1);
  const alertDay = addDays(today, 4);
  const events = await getLiveEventsOn([planDay, reminderDay, thanksDay, alertDay]);
  // A day's warning before the plan email, while there's time to fix it.
  for (const event of events.filter((e) => e.date === alertDay && !e.meetupPoint.trim())) {
    await alertMissingMeetup(event, "tomorrow");
  }
  const results: AttendeeTrackResult[] = [];
  for (const event of events.filter((e) => e.date !== alertDay)) {
    try {
      results.push(await runForEvent(event, event.date === planDay ? "plan" : event.date === reminderDay ? "reminder" : "thanks", now));
    } catch (err) {
      console.error("attendee track failed for", event.slug, err);
    }
  }
  return results;
}
