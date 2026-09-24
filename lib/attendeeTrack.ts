import { getCommsSettings } from "@/lib/eventComms";
import { buildDayBeforeReminder, buildPlanEmail } from "@/lib/eventEmails";
import { getLiveEventsOn, listRsvpsForAttendeeTrack, stampRsvp, type EventDetail } from "@/lib/events";
import { todayNY } from "@/lib/garageTasks";
import { sendEmail } from "@/lib/resendEmail";
import { releaseLink } from "@/lib/rsvpRelease";

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
  email: "plan" | "reminder";
  sent: number;
  failed: number;
  skippedNoStamp: number;
}

async function sendOnce(
  rsvpId: string,
  field: "Plan Email Sent" | "Reminder Sent",
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

async function runForEvent(event: EventDetail, kind: "plan" | "reminder"): Promise<AttendeeTrackResult> {
  const result: AttendeeTrackResult = { slug: event.slug, email: kind, sent: 0, failed: 0, skippedNoStamp: 0 };
  const settings = await getCommsSettings(event.slug).catch(() => null);
  const hasTailgate = Boolean(settings?.active);
  // Tailgate's own day-before email covers D−1 for this event (see top).
  if (kind === "reminder" && hasTailgate) return result;

  const rsvps = await listRsvpsForAttendeeTrack(event.id);
  for (const r of rsvps) {
    if (kind === "plan" ? r.planSentAt : r.reminderSentAt) continue;
    const outcome = await sendOnce(r.id, kind === "plan" ? "Plan Email Sent" : "Reminder Sent", async () => {
      const built =
        kind === "plan"
          ? buildPlanEmail({ recipientName: r.name, event, hasTailgate })
          : buildDayBeforeReminder({ recipientName: r.name, event, releaseUrl: releaseLink(event.slug, r.id, event.date) });
      await sendEmail({ to: r.email, subject: built.subject, html: built.html });
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
  const events = await getLiveEventsOn([planDay, reminderDay]);
  const results: AttendeeTrackResult[] = [];
  for (const event of events) {
    try {
      results.push(await runForEvent(event, event.date === planDay ? "plan" : "reminder"));
    } catch (err) {
      console.error("attendee track failed for", event.slug, err);
    }
  }
  return results;
}
