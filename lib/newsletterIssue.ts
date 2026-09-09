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

  // Feature story — which post, plus optional teaser/image overrides.
  const fsLink = str(f["Featured Story Link"]);
  const fsTeaser = str(f["Featured Story Teaser"]);
  const fsImage = (f["Featured Story Image"] as { url?: string }[] | undefined)?.[0]?.url;
  if (fsLink || fsTeaser || fsImage) {
    options.featureStory = {
      url: fsLink || undefined,
      teaser: fsTeaser || undefined,
      imageUrl: fsImage || undefined,
    };
  }

  const garageBuild = str(f["Garage Build"]);
  if (garageBuild) options.garageBuildSlug = garageBuild;

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

  // Also This Week — the other story of the week (last week's feature, or
  // the second asphalt/dirt post).
  const lwTitle = str(f["Last Week FS Title"]);
  const lwBody = str(f["Last Week FS Body"]);
  const lwLink = str(f["Last FS Week link"]);
  if (lwTitle || lwBody || lwLink) {
    options.alsoThisWeek = {
      title: lwTitle || undefined,
      body: lwBody || undefined,
      url: lwLink || undefined,
    };
  }

  // Upcoming event — pulled from the Facebook group by hand.
  const evTitle = str(f["Event title"]);
  const evTeaser = str(f["Event Teaser"]);
  const evLink = str(f["Event Link"]);
  if (evTitle || evTeaser || evLink) {
    options.event = {
      title: evTitle || undefined,
      teaser: evTeaser || undefined,
      url: evLink || undefined,
    };
  }

  const vlogLink = str(f["Vlog Link"]);
  if (vlogLink) options.vlogUrl = vlogLink;

  const rigName = str(f["Rig Name"]);
  const rigBlurb = str(f["Rig Blurb"]);
  const rigPhoto = (f["Rig Photo"] as { url?: string }[] | undefined)?.[0]?.url;
  if (rigName && rigBlurb) {
    options.rigOfTheWeek = {
      name: rigName,
      blurb: rigBlurb,
      photoUrl: rigPhoto || "",
      photoAlt: rigName,
      ctaUrl: str(f["Rig URL"]) || undefined,
    };
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
