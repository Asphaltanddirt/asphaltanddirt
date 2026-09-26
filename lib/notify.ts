import { createRecord, listRecords, updateRecord, isAirtableConfigured, type AirtableFields, SOCIAL_BASE_ID } from "@/lib/airtable";
import { sendEmail } from "@/lib/resendEmail";
import { sendToUser, isPushConfigured, type PushPayload } from "@/lib/push";
import { slotStart, planPublish } from "@/lib/autoPost";
import { getWeekPosts, type SocialPost } from "@/lib/garageSocial";
import { getTasksBetween, todayNY, weekOf } from "@/lib/garageTasks";
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
const SOCIAL_BASE = SOCIAL_BASE_ID;
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

export type NotifyKind = "Nudge" | "Last call" | "Failure" | "Digest" | "Test" | "Not ready" | "Pin" | "Crew eve" | "Due today";

const str = (v: unknown) => (typeof v === "string" ? v : "");

// ---------------------------------------------------------------- the switch

export async function getNotifySwitch(): Promise<{ on: boolean; id: string | null }> {
  if (!isAirtableConfigured(SOCIAL_BASE)) return { on: false, id: null };
  const rows = await listRecords(SETTINGS, `{Setting} = '${SWITCH}'`, { baseId: SOCIAL_BASE });
  return { on: rows[0]?.fields?.On === true, id: rows[0]?.id || null };
}

export async function setNotifySwitch(on: boolean, by: string) {
  const current = await getNotifySwitch();
  if (!current.id) throw new Error("The Notifications row is missing from Garage Settings.");
  await updateRecord(SETTINGS, current.id, { On: on, "Changed By": by, "Changed At": new Date().toISOString() }, { baseId: SOCIAL_BASE });
}

// ---------------------------------------------------------------- the ledger

/** `<kind>:<record id>:<yyyy-mm-dd>` — the uniqueness guarantee. */
export function ledgerKey(kind: NotifyKind, id: string, day: string) {
  return `${kind.toLowerCase().replace(/\s+/g, "-")}:${id}:${day}`;
}

export async function alreadySent(key: string): Promise<boolean> {
  if (!isAirtableConfigured(GARAGE_BASE)) return false;
  // Escape single quotes so a key can never break the formula.
  const safe = key.replace(/'/g, "\\'");
  const rows = await listRecords(LEDGER, `{Key} = '${safe}'`, { baseId: GARAGE_BASE });
  return rows.length > 0;
}

export async function record(key: string, kind: NotifyKind, subject: string, channel: string, result: string, detail: string) {
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
    await createRecord(LEDGER, fields, { baseId: GARAGE_BASE, typecast: true });
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
async function deliver(key: string, kind: NotifyKind, subject: string, payload: PushPayload, to: string = NOTIFY_EMAIL): Promise<boolean> {
  if (await alreadySent(key)) return false;

  let channel = "None";
  let result = "Failed";
  let detail = "";

  if (isPushConfigured()) {
    const push = await sendToUser(to, payload);
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
        to,
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
  // Scheduled natively ahead of time (Jose 9/26): it goes out on its own.
  if (post.scheduledAt) return false;
  return post.status !== "Posted" && post.status !== "Skipped";
  // NOT gated on having a caption or an attachment. That guard was added and
  // removed the same day (2026-09-23) after it suppressed the Wednesday trail
  // clips for being empty and Jose posted both anyway, off archive footage.
  //
  // His reason is the rule: **a nudge offers the option, it does not assert
  // that the work exists.** Whether a clip goes out depends on what he happens
  // to have — archive footage, something Anthony sent, nothing at all — and
  // none of that is knowable from the card. So no heuristic can predict it,
  // and any attempt to is just a way of deciding for him.
  //
  // He also posts TikTok and YouTube natively from his phone, so an empty card
  // is the normal state of a live slot there, not a sign of an abandoned one.
  // A slot that genuinely isn't wanted comes off the Posting Schedule — a
  // person's decision, made once, in the open.
}

const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(d);

// ---------------------------------------------------------------- the run

/**
 * Why an auto post is not going to go out, or null if it will.
 *
 * Covers the two ways a slot dies in silence. Neither reaches the failure
 * alert, which only fires when a send is actually attempted and errors:
 *
 *  1. **Never approved.** The auto-poster skips it without looking, so there
 *     is no attempt and nothing to fail.
 *  2. **Approved but unpostable** — no image on an image slot, no video on a
 *     clip slot, a caption over X's limit. planPublish refuses it before any
 *     network call, writes "Failed" on the card, and that is the end of it.
 *
 * Wednesday's Instagram trail clip sat in case 1 all day: TikTok and YouTube
 * went out, Instagram quietly did not, and nothing anywhere said so.
 */
export function willNotPost(post: SocialPost): string | null {
  if (!isAutoPlatform(post.platform)) return null;
  if (post.status === "Posted" || post.status === "Skipped") return null;
  if (post.autoStatus === "Posted" || post.autoStatus === "Processing") return null;
  if (!post.approved) return "not approved yet";
  const plan = planPublish(post);
  return plan.ok ? null : plan.reason;
}

export interface NotifyRun {
  ran: boolean;
  reason?: string;
  nudged: string[];
  lastCalls: string[];
  notReady: string[];
  digest: string | null;
  /** People reminded of their own tasks due today (9 AM). */
  dueToday?: string[];
}

export async function runNotifications(options: { now?: Date; force?: boolean } = {}): Promise<NotifyRun> {
  const now = options.now || new Date();
  const out: NotifyRun = { ran: false, nudged: [], lastCalls: [], notReady: [], digest: null };

  if (!options.force) {
    const sw = await getNotifySwitch();
    if (!sw.on) {
      out.reason = "The Notifications switch is off.";
      return out;
    }
  }
  out.ran = true;

  const today = todayNY();
  out.dueToday = await remindDueToday(now, today).catch((err) => {
    console.error("due-today reminders failed", err);
    return [];
  });
  const posts = (await getWeekPosts(weekOf(today))).filter((p) => p.due === today);
  /** Blocked auto slots, grouped by the time their window opens. */
  const notReady = new Map<string, { post: SocialPost; reason: string }[]>();

  for (const post of posts) {
    const window = effectiveWindow(post);
    if (!window) continue;
    const opens = slotStart(post.due, window);
    const closes = slotEnd(post.due, window, opens);

    // Auto slots that can't go out are collected and sent as ONE banner per
    // window below — Saturday alone has three, all waiting on the same clip,
    // and three identical alerts in one minute is the noise this whole design
    // exists to avoid.
    const blocked = willNotPost(post);
    if (blocked && Math.abs(now.getTime() - (opens.getTime() - NUDGE_LEAD_MS)) <= WINDOW_MS / 2) {
      const at = timeLabel(opens);
      notReady.set(at, [...(notReady.get(at) || []), { post, reason: blocked }]);
    }

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

  // One banner per window for everything that won't post at it. Sent at the
  // same ten-minutes-before mark as a by-hand nudge, because that is while
  // there is still time to attach the file or tap Approve — saying so after
  // the window closed is just a report of a dead slot.
  for (const [at, items] of notReady) {
    const key = ledgerKey("Not ready", `${today}-${at.replace(/\W+/g, "")}`, today);
    const reasons = [...new Set(items.map((i) => i.reason))];
    const sent = await deliver(key, "Not ready", `${items.length} not ready at ${at}`, {
      title: items.length === 1 ? `Won't post · ${items[0].post.platform}` : `${items.length} won't post at ${at}`,
      body:
        items.length === 1
          ? `${items[0].post.asset || items[0].post.topic} at ${at} — ${items[0].reason}.`
          : `${items.map((i) => i.post.platform).join(" · ")} — ${reasons.join("; ")}.`,
      url: "/garage/social",
      tag: key,
    });
    if (sent) out.notReady.push(...items.map((i) => i.post.name));
  }

  // Digest: 9 PM ET, one line for everything that went out on its own.
  const hourNY = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hourNY === 21) {
    const digest = buildDigest(posts);
    if (digest) {
      const key = ledgerKey("Digest", today, today);
      const sent = await deliver(key, "Digest", `Daily digest ${today}`, { ...digest, tag: key });
      if (sent) out.digest = digest.title;
    }
  }

  return out;
}

/** The day's digest, or null when nothing went out on its own. */
function buildDigest(posts: SocialPost[]): PushPayload | null {
  const posted = posts.filter((p) => p.autoStatus === "Posted");
  if (posted.length === 0) return null;
  return {
    title: `${posted.length} post${posted.length === 1 ? "" : "s"} went out today`,
    body: posted.map((p) => p.platform).join(" · "),
    url: "/garage/social",
    // The one notification that is a summary rather than a prompt, so it stays
    // up until it's dealt with. Jose swiped the first one away before reading
    // it (2026-09-23) and there was no way to get it back.
    requireInteraction: true,
  };
}

/**
 * Rebuild and send today's digest on demand, from the Control Room.
 *
 * Deliberately sidesteps the day's dedupe key — that key exists to stop the
 * ten-minute cron sending twice, not to stop a person asking to see it again.
 * The re-send gets its own timestamped key so it is still logged, and so two
 * taps a second apart can't both fire.
 */
export async function resendDigest(): Promise<{ sent: boolean; reason?: string }> {
  const today = todayNY();
  const posts = (await getWeekPosts(weekOf(today)).catch(() => [] as SocialPost[])).filter((p) => p.due === today);
  const digest = buildDigest(posts);
  if (!digest) return { sent: false, reason: "Nothing has gone out on its own today." };
  const key = ledgerKey("Digest", `resend-${Date.now()}`, today);
  const sent = await deliver(key, "Digest", `Daily digest ${today} (re-sent)`, { ...digest, tag: key });
  return { sent, reason: sent ? undefined : "Couldn't send it." };
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

// ---------------------------------------------------------------- follow-ups

/**
 * An auto-post that still leaves a job for a person. The week's Feature X post
 * gets pinned by hand (the X API can't pin), and a success that only reaches
 * the 9 PM digest is hours too late for that — so this one alerts the moment
 * it posts. Never throws, like notifyFailure.
 */
export function needsPinning(post: { platform: string; topic: string; asset: string }): boolean {
  return post.platform === "X" && post.topic === "Feature" && post.asset === "X image";
}

export async function notifyPin(post: { id: string; name: string }): Promise<void> {
  try {
    const sw = await getNotifySwitch();
    if (!sw.on) return;
    const key = ledgerKey("Pin", post.id, todayNY());
    await deliver(key, "Pin", post.name, {
      title: "Pin the X post",
      body: "This week's Feature just went out on X. View post → ⋯ → Pin to your profile.",
      url: `/garage/social?card=${post.id}`,
      tag: key,
      requireInteraction: true,
    });
  } catch (err) {
    console.error("pin notification failed", err);
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

// ---------------------------------------------------------------- due today

/**
 * 9 AM Eastern: everyone except Jose gets one alert listing their own open
 * Garage tasks due today (Jose 9/25: Anthony gets notifications too, e.g. the
 * Tuesday "film both Garage Takes"). Jose already has the posting nudges and
 * the calendar, so he's left out to keep his phone quiet. Claude's own tasks
 * never alert anyone. Push first, email only if no push landed; the ledger
 * key makes it once per person per day.
 */
async function remindDueToday(now: Date, today: string): Promise<string[]> {
  const hourNY = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hourNY !== 9) return [];
  const tasks = (await getTasksBetween(today, today)).filter((t) => !t.done);
  const byPerson = new Map<string, string[]>();
  for (const t of tasks) {
    const who = (t.assignee || "").trim().toLowerCase();
    if (!who || who === "claude" || who === "everyone" || who === NOTIFY_EMAIL) continue;
    byPerson.set(who, [...(byPerson.get(who) || []), t.title]);
  }
  const sent: string[] = [];
  for (const [email, titles] of byPerson) {
    const key = ledgerKey("Due today", email, today);
    const payload: PushPayload = {
      title: titles.length === 1 ? "Due today" : `${titles.length} things due today`,
      body: titles.join(" · ").slice(0, 180),
      url: "/garage",
      tag: key,
    };
    if (await deliver(key, "Due today", `Due today for ${email}`, payload, email)) sent.push(email);
  }
  return sent;
}
