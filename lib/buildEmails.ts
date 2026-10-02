import { isAirtableConfigured, listRecords, updateRecord, type AirtableRecord } from "@/lib/airtable";
import { esc, firstNameOf, shell, type WelcomeEmail } from "@/lib/ambassadorWelcome";
import { getApprovedCommunityBuilds } from "@/lib/communityBuilds";
import { sendEmail } from "@/lib/resendEmail";

/**
 * The two emails a builder gets (Jose 2026-10-02: so they share their page,
 * which brings people to the site):
 *
 *   Received — the moment the build form goes through (/api/submit-build).
 *   Live     — once it's approved: right away from the Garage review screen,
 *              and the hourly /api/cron/build-live sweep catches anything
 *              approved straight in Airtable. "Live Email Sent" on the
 *              Submissions record stops a second send.
 */

const SITE = "https://www.asphaltanddirt.com";
const BASE_ID = process.env.AIRTABLE_BUILD_SUBMISSIONS_BASE_ID;
const TABLE = process.env.AIRTABLE_BUILD_SUBMISSIONS_TABLE || "Submissions";
const FROM = "Asphalt & Dirt Builds <builds@asphaltanddirt.com>";
const REPLY_TO = "builds@asphaltanddirt.com";
const SENT_FIELD = "Live Email Sent";

const p = (html: string) =>
  `<tr><td style="padding:0 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;"><p style="margin:0 0 16px;">${html}</p></td></tr>`;

function heading(kicker: string, title: string) {
  return `
      <tr>
        <td align="center" style="padding:40px 32px 16px;">
          <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f86000;">${kicker}</p>
          <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;color:#1a1712;">${title}</h1>
        </td>
      </tr>`;
}

function button(href: string, label: string) {
  return `
      <tr>
        <td align="center" style="padding:8px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="background-color:#f86000;">
              <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#000000;text-decoration:none;">${label}</a>
            </td>
          </tr></table>
        </td>
      </tr>`;
}

const signoff = `
      <tr>
        <td style="padding:28px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0;font-weight:bold;color:#1a1712;">Real people. Real builds. Street to trail.</p>
          <p style="margin:8px 0 0;color:#1a1712;">&mdash; Asphalt &amp; Dirt</p>
        </td>
      </tr>`;

export function buildReceivedEmail(input: { name: string; rigName: string }): WelcomeEmail {
  const first = esc(firstNameOf(input.name));
  const rig = esc(input.rigName);
  const bodyRows = `
      ${heading("Build Submission", "We Got Your Build.")}
      ${p(`Hey ${first},`)}
      ${p(`Thanks for sending us <strong style="color:#1a1712;">${rig}</strong>. A real person on the crew looks at every build, usually within a few days.`)}
      ${p(`When it's approved, it gets its own page on our site and we'll email you the link, so you can share it.`)}
      ${p(`Nothing else you need to do. Want to see what else people are building?`)}
      ${button(`${SITE}/builds/all`, "See the Builds")}
      ${signoff}`;
  return {
    subject: `We got your build: ${input.rigName}`,
    html: shell(`Thanks for sending us ${input.rigName}. We'll email you when its page is live.`, bodyRows),
  };
}

export function buildLiveEmail(input: { name: string; rigName: string; url: string }): WelcomeEmail {
  const first = esc(firstNameOf(input.name));
  const rig = esc(input.rigName);
  const bodyRows = `
      ${heading("Your Build Is Live", `${rig} Is Up.`)}
      ${p(`Hey ${first},`)}
      ${p(`<strong style="color:#1a1712;">${rig}</strong> has its own page on the Asphalt &amp; Dirt site now. Go take a look:`)}
      ${button(esc(input.url), "See Your Build")}
      ${p(`Share it with your people. Post the link, put it in your bio, tag <strong style="color:#f86000;">#AsphaltAndDirt</strong>.`)}
      ${p(`Something wrong or want to add photos? Just reply to this email.`)}
      ${signoff}`;
  return {
    subject: `Your build is live: ${input.rigName}`,
    html: shell(`${input.rigName} has its own page on the Asphalt & Dirt site.`, bodyRows),
  };
}

/** Sends the received email. Best-effort: never blocks the submission. */
export async function sendBuildReceived(input: { name: string; email: string; rigName: string }): Promise<void> {
  try {
    const mail = buildReceivedEmail(input);
    await sendEmail({ to: input.email, from: FROM, replyTo: REPLY_TO, ...mail });
  } catch (err) {
    console.error("build received email failed", err);
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

async function sendLiveFor(record: AirtableRecord, slugById: Map<string, string>): Promise<boolean> {
  const f = record.fields;
  const email = str(f.Email);
  const slug = slugById.get(record.id);
  // No page (missing photos/name) or no address: nothing to send yet.
  if (!email || !slug) return false;
  const mail = buildLiveEmail({ name: str(f["Full Name"]), rigName: str(f["Rig Name"]), url: `${SITE}/builds/${slug}` });
  await sendEmail({ to: email, from: FROM, replyTo: REPLY_TO, ...mail });
  await updateRecord(TABLE, record.id, { [SENT_FIELD]: new Date().toISOString() }, { baseId: BASE_ID });
  return true;
}

async function slugsById(): Promise<Map<string, string>> {
  const builds = await getApprovedCommunityBuilds({ fresh: true });
  return new Map(builds.filter((b) => b.recordId).map((b) => [b.recordId as string, b.slug]));
}

/** Every approved build that hasn't had its live email yet. */
export async function sweepBuildLiveEmails(): Promise<{ sent: number; skipped: number }> {
  if (!isAirtableConfigured(BASE_ID)) return { sent: 0, skipped: 0 };
  const records = await listRecords(TABLE, `AND({Approved}, {${SENT_FIELD}} = BLANK())`, { baseId: BASE_ID });
  if (!records.length) return { sent: 0, skipped: 0 };
  const slugs = await slugsById();
  let sent = 0;
  let skipped = 0;
  for (const r of records) {
    try {
      if (await sendLiveFor(r, slugs)) sent++;
      else skipped++;
    } catch (err) {
      skipped++;
      console.error("build live email failed", r.id, err);
    }
  }
  return { sent, skipped };
}

/** Right after approving in the Garage. Best-effort: the sweep retries. */
export async function sendBuildLiveNow(recordId: string): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) return;
  try {
    const [record] = await listRecords(TABLE, `AND(RECORD_ID() = '${recordId}', {Approved}, {${SENT_FIELD}} = BLANK())`, { baseId: BASE_ID });
    if (record) await sendLiveFor(record, await slugsById());
  } catch (err) {
    console.error("build live email (approve) failed", recordId, err);
  }
}
