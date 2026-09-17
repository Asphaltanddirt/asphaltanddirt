import { buildWeeklyDigest, wrapNewsletterEmail } from "@/lib/newsletter";
import { archiveIssue, getDraftIssue } from "@/lib/newsletterIssue";
import { sendNewsletter, type SendResult } from "@/lib/newsletterSend";

/**
 * The weekly Dirt Line from the newest Draft row in the Newsletters table:
 * preview it, send a test, or send it live (which archives the row as Sent).
 * Shared by the Garage Newsletter screen and /api/admin/send-weekly-digest.
 */

export class NoDraftIssueError extends Error {
  constructor() {
    super("No Draft row in the Newsletters table. Start this week's issue first.");
    this.name = "NoDraftIssueError";
  }
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://asphaltanddirt.com";

export async function renderDraftPreview(): Promise<{ subject: string; html: string }> {
  const draft = await getDraftIssue();
  if (!draft) throw new NoDraftIssueError();
  const content = await buildWeeklyDigest(draft.options);
  return {
    subject: content.subject,
    html: wrapNewsletterEmail(content, {
      unsubscribeUrl: `${SITE}/api/newsletter/unsubscribe?token=preview`,
      mailingAddress: process.env.NEWSLETTER_MAILING_ADDRESS || "Asphalt & Dirt — [NEWSLETTER_MAILING_ADDRESS not set]",
    }),
  };
}

export async function sendDraftDigest(
  mode: "test" | "live",
): Promise<SendResult & { subject: string; issueRecordId: string }> {
  const draft = await getDraftIssue();
  if (!draft) throw new NoDraftIssueError();
  const content = await buildWeeklyDigest(draft.options);
  const result = await sendNewsletter(content, mode);

  // Archive back to the row only on a real send that landed.
  if (mode === "live" && result.sent > 0) {
    const archiveHtml = wrapNewsletterEmail(content, {
      unsubscribeUrl: `${SITE}/api/newsletter/unsubscribe`,
      mailingAddress: process.env.NEWSLETTER_MAILING_ADDRESS || "",
    });
    try {
      await archiveIssue(draft.recordId, { subject: content.subject, html: archiveHtml, recipients: result.sent });
    } catch (err) {
      console.error("weekly digest archive write failed (email already sent)", err);
    }
  }
  return { ...result, subject: content.subject, issueRecordId: draft.recordId };
}
