/**
 * Minimal Resend single-email send. Transactional one-offs (ambassador
 * welcome emails, etc.) — the newsletter has its own batch path in
 * lib/newsletterSend.ts.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend is not configured (missing RESEND_API_KEY).");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: from || process.env.CREW_FROM_EMAIL || "Asphalt & Dirt Crew <crew@asphaltanddirt.com>",
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
}
