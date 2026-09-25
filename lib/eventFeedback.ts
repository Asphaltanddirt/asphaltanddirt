import { createRecord, isAirtableConfigured, listRecords } from "@/lib/airtable";
import { SITE_URL } from "@/lib/site";

/**
 * "How was it?" after a ride (punchlist #11, Jose 9/25). The thank-you email's
 * "Tell us how it went" button opens /events/<slug>/feedback; answers land in
 * Events → Event Feedback against the event's slug, and owners read them on
 * the Garage event page. No login and no personal data in the link: name is
 * optional on the form, so an answer can be anonymous.
 */

const BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID || "app5LS6dvcTKdxGqr";
const TABLE = "Event Feedback";

export const COME_AGAIN = ["Yes", "Maybe", "No"] as const;
export type ComeAgain = (typeof COME_AGAIN)[number];

export interface EventFeedback {
  id: string;
  name: string;
  howWasIt: string;
  comeAgain: ComeAgain | "";
  submittedAt: string;
}

export function feedbackUrl(slug: string): string {
  return `${SITE_URL}/events/${slug}/feedback`;
}

export async function saveFeedback(input: { slug: string; name: string; howWasIt: string; comeAgain: ComeAgain | "" }) {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("The Events base isn't configured.");
  await createRecord(
    TABLE,
    {
      Name: input.name.slice(0, 120) || "(no name)",
      "Event Slug": input.slug,
      "How Was It": input.howWasIt.slice(0, 4000),
      ...(input.comeAgain ? { "Come Again": input.comeAgain } : {}),
      "Submitted At": new Date().toISOString(),
    },
    { baseId: BASE_ID, typecast: true },
  );
}

export async function getFeedbackFor(slug: string): Promise<EventFeedback[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const safe = slug.replace(/'/g, "\\'");
  const rows = await listRecords(TABLE, `{Event Slug} = '${safe}'`, { baseId: BASE_ID });
  return rows
    .map((r) => ({
      id: r.id,
      name: String(r.fields.Name || ""),
      howWasIt: String(r.fields["How Was It"] || ""),
      comeAgain: (COME_AGAIN as readonly string[]).includes(String(r.fields["Come Again"])) ? (r.fields["Come Again"] as ComeAgain) : ("" as const),
      submittedAt: String(r.fields["Submitted At"] || ""),
    }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
