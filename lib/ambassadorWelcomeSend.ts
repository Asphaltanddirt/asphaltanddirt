import { listRecords, updateRecord, type AirtableRecord } from "@/lib/airtable";
import { buildWelcomePart1, buildWelcomePart2 } from "@/lib/ambassadorWelcome";
import { sendEmail } from "@/lib/resendEmail";

const AMBASSADORS_TABLE = process.env.AIRTABLE_AMBASSADORS_TABLE || "Ambassadors";
const TEST_EMAIL =
  process.env.NEWSLETTER_TEST_EMAIL ||
  process.env.AMBASSADOR_APPLICATIONS_TO_EMAIL ||
  process.env.AGREEMENT_ACCEPTANCE_TO_EMAIL ||
  "";
const CREW_REPLY_TO = "crew@asphaltanddirt.com";

export type WelcomePart = 1 | 2;

export type WelcomeSendResult =
  | { status: "sent"; part: WelcomePart; to: string; name: string }
  | { status: "already-sent"; part: WelcomePart; name: string }
  | { status: "skipped"; part: WelcomePart; reason: string };

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/** Find one Ambassador record by id (preferred) or email. */
export async function findAmbassador(opts: {
  recordId?: string;
  email?: string;
}): Promise<AirtableRecord | undefined> {
  const formula = opts.recordId
    ? `RECORD_ID() = '${opts.recordId.replace(/'/g, "\\'")}'`
    : `LOWER({Email}) = LOWER('${(opts.email || "").replace(/'/g, "\\'")}')`;
  return (await listRecords(AMBASSADORS_TABLE, formula))[0];
}

/**
 * Sends one of the two Road & Trail Crew welcome emails for an ambassador
 * and stamps the record. Idempotent (skips when "Welcome N Sent" is set,
 * unless `test`). Part 2 needs Agreement Signed + Promo Code + Tracking
 * Link — otherwise it's skipped with a reason, never sent early.
 */
export async function sendAmbassadorWelcome(
  ambassador: AirtableRecord,
  part: WelcomePart,
  opts: { test?: boolean } = {},
): Promise<WelcomeSendResult> {
  const f = ambassador.fields;
  const name = (f.Name as string) || "";
  const test = opts.test === true;

  const sentFlag = part === 1 ? "Welcome 1 Sent" : "Welcome 2 Sent";
  const sentDateFlag = part === 1 ? "Welcome 1 Sent Date" : "Welcome 2 Sent Date";
  const triggerFlag = part === 1 ? "Send Welcome 1" : "Send Welcome 2";

  if (!test && f[sentFlag] === true) return { status: "already-sent", part, name };

  const toEmail = test ? TEST_EMAIL : ((f.Email as string) || "").trim();
  if (!toEmail) {
    return { status: "skipped", part, reason: test ? "NEWSLETTER_TEST_EMAIL not set" : "ambassador record has no email" };
  }

  let email: { subject: string; html: string };
  if (part === 1) {
    email = buildWelcomePart1({ name, tier: f.Tier as string | undefined });
  } else {
    if (f["Agreement Signed"] !== true) return { status: "skipped", part, reason: "agreement not signed" };
    const code = ((f["Promo Code"] as string) || "").trim();
    const trackingLink = ((f["Tracking Link"] as string) || "").trim();
    if (!code || !trackingLink) return { status: "skipped", part, reason: "promo code or tracking link not set" };
    email = buildWelcomePart2({ name, code, trackingLink });
  }

  await sendEmail({
    to: toEmail,
    subject: test ? `[TEST] ${email.subject}` : email.subject,
    html: email.html,
    replyTo: CREW_REPLY_TO,
  });

  if (!test) {
    try {
      await updateRecord(AMBASSADORS_TABLE, ambassador.id, {
        [sentFlag]: true,
        [sentDateFlag]: todayISODate(),
        [triggerFlag]: false,
      });
    } catch (err) {
      // The email already went out — log, don't throw.
      console.error("ambassador welcome record stamp failed (email already sent)", err);
    }
  }

  return { status: "sent", part, to: test ? "test" : toEmail, name };
}
