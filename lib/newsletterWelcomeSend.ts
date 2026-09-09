import { wrapNewsletterEmail } from "@/lib/newsletter";
import { buildWelcomeEmail, WELCOME_SCHEDULE, WELCOME_STEPS } from "@/lib/newsletterWelcome";
import {
  listWelcomeCandidates,
  stampWelcomeStep,
  type WelcomeCandidate,
} from "@/lib/newsletterSubscribers";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

const FROM = process.env.NEWSLETTER_FROM_EMAIL || "The Dirt Line <dirtline@asphaltanddirt.com>";
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO || "team@asphaltanddirt.com";
const MAILING_ADDRESS = process.env.NEWSLETTER_MAILING_ADDRESS || "";
// Resend free tier: 100 emails/day across the whole account. Stay well under.
const DAILY_CAP = 80;

function unsubscribeUrl(token: string) {
  return `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function daysBetween(fromISO: string, toDate: Date): number {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime();
  const to = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
  return Math.floor((to - from) / 86_400_000);
}

/** Sends one welcome-sequence email to one subscriber and advances their
 *  step. `step` is 1-indexed. */
export async function sendWelcomeStep(sub: WelcomeCandidate, step: number): Promise<void> {
  if (!MAILING_ADDRESS) {
    throw new Error("NEWSLETTER_MAILING_ADDRESS must be set before sending welcome emails (CAN-SPAM).");
  }
  const content = buildWelcomeEmail(step);
  const html = wrapNewsletterEmail(content, {
    unsubscribeUrl: unsubscribeUrl(sub.token),
    mailingAddress: MAILING_ADDRESS,
  });
  await sendEmail({
    to: sub.email,
    subject: content.subject,
    html,
    from: FROM,
    replyTo: REPLY_TO,
  });
  await stampWelcomeStep(sub.id, step);
}

export interface WelcomeSweepResult {
  checked: number;
  sent: { email: string; step: number }[];
  skipped: { email: string; reason: string }[];
}

/**
 * Daily sweep: for each Active subscriber mid-sequence, sends the next
 * welcome email if it's due (Subscribed Date + WELCOME_SCHEDULE[step-1]).
 * One step per subscriber per run — a backlog (cron was down) catches up a
 * day at a time rather than firing several at once.
 */
export async function processWelcomeSequence(now: Date = new Date()): Promise<WelcomeSweepResult> {
  const candidates = await listWelcomeCandidates(WELCOME_STEPS);
  const result: WelcomeSweepResult = { checked: candidates.length, sent: [], skipped: [] };

  for (const sub of candidates) {
    if (result.sent.length >= DAILY_CAP) {
      result.skipped.push({ email: sub.email, reason: "daily cap reached" });
      continue;
    }
    const nextStep = sub.welcomeStep + 1;
    if (nextStep > WELCOME_STEPS) continue;

    const dueAfterDays = WELCOME_SCHEDULE[nextStep - 1];
    const age = daysBetween(sub.subscribedDate, now);
    if (age < dueAfterDays) {
      continue; // not due yet
    }

    try {
      await sendWelcomeStep(sub, nextStep);
      result.sent.push({ email: sub.email, step: nextStep });
    } catch (err) {
      console.error("welcome sweep send failed for", sub.email, err);
      result.skipped.push({ email: sub.email, reason: "send failed" });
    }
  }

  return result;
}
