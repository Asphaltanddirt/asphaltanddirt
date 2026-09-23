import { createRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";
import { sendEmail } from "@/lib/resendEmail";
import { sendToUser, isPushConfigured, type PushPayload } from "@/lib/push";
import { slotStart } from "@/lib/autoPost";
import { getWeekPosts, type SocialPost } from "@/lib/garageSocial";
import { todayNY, weekOf } from "@/lib/garageTasks";
import { isAutoPlatform } from "@/lib/socialCopy";
import { SITE_URL } from "@/lib/site";

/**
 * Garage notifications.
 *
 * Three classes, and the difference between them is the whole design:
 *
 *  - **Do this** — a by-hand slot is about to open. Nudge 10 minutes before,
 *    then a last call near the close, but ONLY if the card still isn't marked
 *    posted. A reminder for something already done is how you teach someone to
 *    ignore reminders.
 *  - **It failed** — sent the moment the auto-poster gives up, from inside the
 *    auto-poster, not from this cron. A dead window you hear about ten minutes
 *    late is ten minutes of dead window.
 *  - **It went out** — ONE digest at the end of the day. ~21 posts a week go
 *    out on their own; a banner each is three a day forever, which is how
 *    notifications get muted, which would kill the reminders too.
 *
 * Everything is deduped through the Notifications table: this runs every ten
 * minutes, so "have I already sent this?" is the load-bearing question.
 */

const GARAGE_BASE = process.env.AIRTABLE_GARAGE_BASE_ID || "apptUHYPJL0wjAuPe";
const ANALYTICS_BASE = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const LEDGER = "Notifications";
const SETTINGS = "Garage Settings";
const SWITCH = "Notifications";

/** Who gets notified. Jose only while this is being tested (his call, 9/23). */
export const NOTIFY_EMAIL = "jrodrigues1278@gmail.com";

/** Nudge this far before a window opens — enough time to open the app, save
 *  the image and get into the platform. */
const NUDGE_LEAD_MS = 10 * 60 * 1000;
/** Last call this far before a window closes. */
const LAST_CALL_LEAD_MS = 15 * 60 * 1000;
/** How close to the target a run has to land. The cron is every 10 minutes. */
const WINDOW_MS = 10 * 60 * 1000;

export type NotifyKind = "Nudge" | "Last call" | "Failure" | "Digest" | "Test";

const str = (v: unknown) => (typeof v === "string" ? v : "");

// ---------------------------------------------------------------- the switch

export async function getNotifySwitch(): Promise<{ on: boolean; id: string | null }> {
  if (!isAirtableConfigured(ANALYTICS_BASE)) return { on: false, id: null };
  const rows = await listRecords(SETTINGS, `{Setting} = '${SWITCH}'`, { baseId: ANALYTICS_BASE });
  return { on: rows[0]?.fields?.On === true, id: rows[0]?.id || null };
}

export async function setNotifySwitch(on: boolean, by: string) {
  const current = await getNotifySwitch();
  if (!current.id) throw new Error("The Notifications row is missing from Garage Settings.");
  await updateRecord(SETTINGS, current.id, { On: on, "Changed By": by, "Changed At": new Date().toISOString() }, { baseId: ANALYTICS_BASE });
}

// ---------------------------------------------------------------- the ledger

/** `<kind>:<record id>:<yyyy-mm-dd>` — the uniqueness guarantee. */
export function ledgerKey(kind: NotifyKind, id: string, day: string) {
  return `${kind.toLowerCase().replace(/\s+/g, "-")}:${id}:${day}`;
}

async function alreadySent(key: string): Promise<boolean> {
  if (!isAirtableConfigured(GARAGE_BASE)) return false;
  // Escape single quotes so a key can never break the formula.
  const safe = key.replace(/'/g, "\\'");
  const rows = await listRecords(LEDGER, `{Key} = '${safe}'`, { baseId: GARAGE_BASE });
  return rows.length > 0;
}

async function record(key: string, kind: NotifyKind, subject: string, channel: string, result: string, detail: string) {
  if (!isAirtableConfigured(GARAGE_BASE)) return;
  const fields: AirtableFields = {
    Key: key,
    Kind: kind,
    Subject: subject,
    "Sent At": new Date().toISOString(),
    Channel: channel,
    Result: result,
    Detail: detail.slice(0, 5000),
  };
  try {
    await createRecord(LEDGER, fields, { baseId: GARAGE_BASE });
  } catch (err) {
    console.error("notify ledger write failed", err);
  }
}

// ---------------------------------------------------------------- delivery

function emailHtml(payload: PushPayload) {
  const link = `${SITE_URL}${payload.url || "/garage"}`;
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.5;color:#111">
  <p style="margin:0 0 8px;font-weight:600">${payload.title}</p>
  <p style="margin:0 0 16px">${payload.body}</p>
  <p style="margin:0"><a href="${link}" style="color:#c2410c">Open the Garage</a></p>
</div>`;
}

/**
 * Push first, email only if push could not land. Never both for one key —
 * two alerts for one thing is the same noise problem in a different coat.
 */
async function deliver(key: string, kind: NotifyKind, subject: string, payload: PushPayload): Promise<boolean> {
  if (await alreadySent(key)) return false;

  let channel = "None";
  let result = "Failed";
  let detail = "";

  if (isPushConfigured()) {
    const push = await sendToUser(NOTIFY_EMAIL, payload);
    detail = `push sent=${push.sent} failed=${push.failed} retired=${push.retired} ${push.errors.join(" | ")}`.trim();
    if (push.sent > 0) {
      channel = "Push";
      result = "Sent";
    }
  } else {
    detail = "Push not configured.";
  }

  if (result !== "Sent") {
    try {
      await sendEmail({
        to: NOTIFY_EMAIL,
        subject: `${payload.title} — ${payload.body}`.slice(0, 120),
        html: emailHtml(payload),
      });
      channel = "Email";
      result = "Sent";
      detail = `${detail} → fell back to email`.trim();
    } catch (err) {
      detail = `${detail} | email failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  await record(key, kind, subject, channel, result, detail);
  return result === "Sent";
}

// ---------------------------------------------------------------- windows

/**
 * When a window closes. Windows are written for people — "12:30–1:30 PM",
 * "6–8 PM", "7–8 PM", "1 PM (timing test)" — so this looks for a SECOND time
 * after a dash. No second time (a point, not a range) means an hour after it
 * opens, which is the shortest real window on the board.
 */
export function slotEnd(due: string, window: string, start: Date): Date {
  const range = window.match(/(\d{1,2})(?::(\d{2}))?\s*(?:[–—-]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!range) return new Date(start.getTime() + 60 * 60 * 1000);

  let hour = Number(range[3]);
  const minute = Number(range[4] || 0);
  const meridiem = (range[5] || window.match(/\b(am|pm)\b/i)?.[1] || "pm").toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  // Rebuild through slotStart so the America/New_York offset (and therefore
  // DST — it ends Nov 1, before the podcast launches) is handled in one place.
  const end = slotStart(due, `${hour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "pm" : "am"}`);
  // A range that reads as ending before it starts means the parse went wrong.
  return end.getTime() > start.getTime() ? end : new Date(start.getTime() + 60 * 60 * 1000);
}

/** The time a TikTok test slot actually uses, which overrides the base window. */
export function effectiveWindow(post: SocialPost): string {
  return post.testSlot ? `${post.testSlot} (timing test)` : post.window;
}

/**
 * A post needs a human when its platform has no auto-posting path — today
 * TikTok and the Facebook Group. Derived, not hardcoded: the day TikTok
 * posting is ever automated, these nudges stop on their own.
 */
export function needsAHuman(post: SocialPost): boolean {
  if (isAutoPlatform(post.platform)) return false;
  if (post.status === "Posted" || post.status === "Skipped") return false;
  // A slot with nothing on it isn't a task. The Wednesday trail clips generate
  // a card every week but wait on footage that often never arrives (Anthony
  // films weekends now), and nudging for work that can't be done is exactly
  // the noise that gets notifications muted. Same test the auto-poster uses to
  // refuse a post: is there actually anything to put out?
  return Boolean(post.caption.trim() || post.drafts.length > 0 || post.assets.length > 0);
}

const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(d);

// ---------------------------------------------------------------- the run

export interface NotifyRun {
  ran: boolean;
  reason?: string;
  nudged: string[];
  lastCalls: string[];
  digest: string | null;
}

export async function runNotifications(options: { now?: Date; force?: boolean } = {}): Promise<NotifyRun> {
  const now = options.now || new Date();
  const out: NotifyRun = { ran: false, nudged: [], lastCalls: [], digest: null };

  if (!options.force) {
    const sw = await getNotifySwitch();
    if (!sw.on) {
      out.reason = "The Notifications switch is off.";
      return out;
    }
  }
  out.ran = true;

  const today = todayNY();
  const posts = (await getWeekPosts(weekOf(today))).filter((p) => p.due === today);

  for (const post of posts) {
    const window = effectiveWindow(post);
    if (!window) continue;
    const opens = slotStart(post.due, window);
    const closes = slotEnd(post.due, window, opens);

    if (needsAHuman(post)) {
      // Nudge: 10 minutes before the window opens.
      const nudgeAt = opens.getTime() - NUDGE_LEAD_MS;
      if (Math.abs(now.getTime() - nudgeAt) <= WINDOW_MS / 2) {
        const key = ledgerKey("Nudge", post.id, today);
        const sent = await deliver(key, "Nudge", post.name, {
          title: `${post.platform} · ${post.asset || post.topic}`.trim(),
          body: `Window ${timeLabel(opens)}–${timeLabel(closes)}. Opens in 10 minutes.`,
          url: `/garage/social?card=${post.id}`,
          tag: key,
        });
        if (sent) out.nudged.push(post.name);
      }

      // Last call: near the close, and only because it still isn't posted.
      const lastAt = closes.getTime() - LAST_CALL_LEAD_MS;
      if (Math.abs(now.getTime() - lastAt) <= WINDOW_MS / 2) {
        const key = ledgerKey("Last call", post.id, today);
        const sent = await deliver(key, "Last call", post.name, {
          title: `Last call · ${post.platform}`,
          body: `${post.asset || post.topic} — window closes at ${timeLabel(closes)}.`,
          url: `/garage/social?card=${post.id}`,
          tag: key,
        });
        if (sent) out.lastCalls.push(post.name);
      }
    }
  }

  // Digest: 9 PM ET, one line for everything that went out on its own.
  const hourNY = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hourNY === 21) {
    const posted = posts.filter((p) => p.autoStatus === "Posted");
    if (posted.length > 0) {
      const key = ledgerKey("Digest", today, today);
      const sent = await deliver(key, "Digest", `Daily digest ${today}`, {
        title: `${posted.length} post${posted.length === 1 ? "" : "s"} went out today`,
        body: posted.map((p) => p.platform).join(" · "),
        url: "/garage/social",
        tag: key,
      });
      if (sent) out.digest = `${posted.length} posts`;
    }
  }

  return out;
}

// ---------------------------------------------------------------- failures

/**
 * Called from the auto-poster the moment a post fails, so the alert is
 * immediate rather than waiting for the next ten-minute run. Never throws —
 * a broken notifier must not also break posting.
 */
export async function notifyFailure(post: { id: string; name: string; platform: string }, reason: string): Promise<void> {
  try {
    const sw = await getNotifySwitch();
    if (!sw.on) return;
    const key = ledgerKey("Failure", post.id, todayNY());
    await deliver(key, "Failure", post.name, {
      title: `Didn't post · ${post.platform}`,
      body: `${post.name} — ${reason}`,
      url: `/garage/social?card=${post.id}`,
      tag: key,
      requireInteraction: true,
    });
  } catch (err) {
    console.error("failure notification failed", err);
  }
}

/** The "Send me a test" button in the Control Room. */
export async function sendTestNotification(): Promise<boolean> {
  const key = ledgerKey("Test", "manual", new Date().toISOString());
  return deliver(key, "Test", "Test notification", {
    title: "Garage notifications are on",
    body: "This is what a posting reminder will look like.",
    url: "/garage/social",
  });
}
