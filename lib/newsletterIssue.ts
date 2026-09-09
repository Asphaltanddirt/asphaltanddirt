import { listRecords, updateRecord } from "@/lib/airtable";
import type { WeeklyDigestOptions } from "@/lib/newsletter";
import { socialLinks } from "@/lib/social";

/**
 * The Newsletters table (one row per weekly digest) in the Newsletter base.
 * You fill Trail Talk + Rig of the Week during the week; the send route
 * reads the newest Draft row, and stamps the archive fields back onto it
 * after a live send.
 */
const BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const TABLE = process.env.AIRTABLE_NEWSLETTERS_TABLE || "Newsletters";

// Airtable long-text tops out around 100k chars.
const HTML_ARCHIVE_LIMIT = 95_000;

export interface DraftIssue {
  recordId: string;
  weekOf: string;
  options: WeeklyDigestOptions;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The newest Draft row from the Newsletters table, mapped to digest
 *  options. Returns null if there's no Draft row (or the base isn't set). */
export async function getDraftIssue(): Promise<DraftIssue | null> {
  if (!BASE_ID) return null;

  const rows = await listRecords(TABLE, "{Status} = 'Draft'", { baseId: BASE_ID });
  if (rows.length === 0) return null;

  rows.sort((a, b) =>
    String(b.fields["Week Of"] || "").localeCompare(String(a.fields["Week Of"] || "")),
  );
  const row = rows[0];
  const f = row.fields;

  const options: WeeklyDigestOptions = {};

  const ttTitle = str(f["Trail Talk Title"]);
  const ttBody = str(f["Trail Talk Body"]);
  if (ttTitle && ttBody) {
    options.trailTalk = {
      title: ttTitle,
      body: ttBody,
      ctaText: "Join The Conversation",
      ctaUrl: str(f["Trail Talk Link"]) || socialLinks.facebookGroup,
    };
  }

  const rigName = str(f["Rig Name"]);
  const rigBlurb = str(f["Rig Blurb"]);
  const rigPhoto = (f["Rig Photo"] as { url?: string }[] | undefined)?.[0]?.url;
  if (rigName && rigBlurb && rigPhoto) {
    options.rigOfTheWeek = { name: rigName, blurb: rigBlurb, photoUrl: rigPhoto, photoAlt: rigName };
  }

  return { recordId: row.id, weekOf: str(f["Week Of"]), options };
}

/** Stamps a Newsletters row after a live send. */
export async function archiveIssue(
  recordId: string,
  data: { subject: string; html: string; recipients: number },
): Promise<void> {
  if (!BASE_ID) return;
  await updateRecord(
    TABLE,
    recordId,
    {
      Status: "Sent",
      "Subject Sent": data.subject,
      "Sent Date": new Date().toISOString().slice(0, 10),
      Recipients: data.recipients,
      "Rendered HTML": data.html.slice(0, HTML_ARCHIVE_LIMIT),
    },
    { baseId: BASE_ID },
  );
}
