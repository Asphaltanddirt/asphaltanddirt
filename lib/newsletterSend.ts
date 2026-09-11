import { listActiveRecipients } from "@/lib/newsletterSubscribers";
import { wrapNewsletterEmail, type NewsletterContent } from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";

const FROM = process.env.NEWSLETTER_FROM_EMAIL || "The Dirt Line <dirtline@asphaltanddirt.com>";
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO || undefined;
const MAILING_ADDRESS = process.env.NEWSLETTER_MAILING_ADDRESS || "";
const TEST_EMAIL =
  process.env.NEWSLETTER_TEST_EMAIL || process.env.AMBASSADOR_APPLICATIONS_TO_EMAIL || "";

// Resend's free tier caps the whole account at 100 emails/day. Stay under
// it with headroom; past this, move to Resend Pro (no daily cap) before a
// live send.
const DAILY_CAP = 90;
// Resend's batch endpoint accepts up to 100 messages per call.
const BATCH_SIZE = 100;

function unsubscribeUrl(token: string) {
  return `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

export interface SendResult {
  mode: "test" | "live";
  recipients: number;
  sent: number;
  failed: number;
  skipped?: string;
}

interface ResendEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  headers?: Record<string, string>;
}

async function sendBatch(apiKey: string, emails: ResendEmail[]) {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(emails),
  });
  if (!res.ok) {
    throw new Error(`Resend batch send failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Sends a built newsletter over the Airtable subscriber list via Resend.
 *
 * mode "test" — one copy to NEWSLETTER_TEST_EMAIL, subject prefixed [TEST],
 *   with a dummy unsubscribe link. Use it to eyeball the real rendered
 *   email in an inbox before committing.
 * mode "live" — one personalized copy to every Active subscriber, each
 *   with their own working unsubscribe link and List-Unsubscribe headers.
 *   Refuses to run without NEWSLETTER_MAILING_ADDRESS (CAN-SPAM) or if the
 *   list is over the free-tier daily cap.
 */
export async function sendNewsletter(
  content: NewsletterContent,
  mode: "test" | "live",
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend is not configured (missing RESEND_API_KEY).");

  if (mode === "test") {
    if (!TEST_EMAIL) throw new Error("Set NEWSLETTER_TEST_EMAIL to run a test send.");
    const html = wrapNewsletterEmail(content, {
      unsubscribeUrl: unsubscribeUrl("test-preview"),
      mailingAddress: MAILING_ADDRESS || "Asphalt & Dirt — [NEWSLETTER_MAILING_ADDRESS not set]",
    });
    await sendBatch(apiKey, [
      {
        from: FROM,
        to: [TEST_EMAIL],
        subject: `[TEST] ${content.subject}`,
        html,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      },
    ]);
    return { mode, recipients: 1, sent: 1, failed: 0 };
  }

  // live
  if (!MAILING_ADDRESS) {
    throw new Error(
      "NEWSLETTER_MAILING_ADDRESS must be set before a live send — CAN-SPAM requires a physical mailing address in the footer.",
    );
  }

  const recipients = await listActiveRecipients();
  if (recipients.length === 0) {
    return { mode, recipients: 0, sent: 0, failed: 0, skipped: "no active subscribers" };
  }
  if (recipients.length > DAILY_CAP) {
    return {
      mode,
      recipients: recipients.length,
      sent: 0,
      failed: 0,
      skipped: `list (${recipients.length}) is over the ${DAILY_CAP}/day Resend free-tier cap — upgrade to Resend Pro before sending`,
    };
  }

  const emails: ResendEmail[] = recipients.map((r) => {
    const url = unsubscribeUrl(r.token);
    return {
      from: FROM,
      to: [r.email],
      subject: content.subject,
      html: wrapNewsletterEmail(content, {
        unsubscribeUrl: url,
        mailingAddress: MAILING_ADDRESS,
        recipientFirstName: r.firstName,
      }),
      headers: {
        "List-Unsubscribe": `<${url}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    };
  });

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE);
    try {
      await sendBatch(apiKey, chunk);
      sent += chunk.length;
    } catch (err) {
      console.error("Newsletter batch send failed", err);
      failed += chunk.length;
    }
  }

  return { mode, recipients: recipients.length, sent, failed };
}
