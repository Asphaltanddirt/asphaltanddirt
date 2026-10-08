import { listRecords, isAirtableConfigured } from "@/lib/airtable";

/**
 * Sent issues of The Dirt Line as web pages (Jose 10/8): the "View in
 * browser" link in every email and /newsletter (past issues). The source is
 * the Rendered HTML that archiveIssue stamps on each Newsletters row after a
 * live send; it carries no subscriber details (generic unsubscribe link).
 */
const BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const TABLE = process.env.AIRTABLE_NEWSLETTERS_TABLE || "Newsletters";

export interface SentIssue {
  date: string; // Sent Date, YYYY-MM-DD (New York)
  subject: string;
  previewText: string;
  html: string;
}

/** The Eastern date, which is what the issue's address uses. */
export function issueDateNY(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

export function issuePath(date: string): string {
  return `/newsletter/${date}`;
}

function previewOf(html: string): string {
  const m = html.match(/<span style="display:none[^"]*">([^<]*)<\/span>/);
  return (m?.[1] || "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

export async function listSentIssues(): Promise<SentIssue[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(TABLE, `AND({Status} = 'Sent', {Rendered HTML} != '', {Sent Date} != '')`, { baseId: BASE_ID });
  return rows
    .map((r) => {
      const html = String(r.fields["Rendered HTML"] || "");
      return {
        date: String(r.fields["Sent Date"] || ""),
        subject: String(r.fields["Subject Sent"] || r.fields["Subject Line"] || "The Dirt Line"),
        previewText: previewOf(html),
        html,
      };
    })
    .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && i.html.includes("</html>"))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSentIssue(date: string): Promise<SentIssue | undefined> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return (await listSentIssues()).find((i) => i.date === date);
}
