import { createRecord, listRecords, isAirtableConfigured } from "@/lib/airtable";
import { DEFAULT_BRAND } from "@/lib/newsletterSubscribers";

/** Numbers and issues for the Garage Newsletter screen. Owners only. */

const BASE_ID = process.env.AIRTABLE_NEWSLETTER_BASE_ID;
const SUBSCRIBERS = "Subscribers";
const ISSUES = process.env.AIRTABLE_NEWSLETTERS_TABLE || "Newsletters";

/** Resend's free tier: keep in step with DAILY_CAP in lib/newsletterSend.ts. */
export const DAILY_SEND_CAP = 90;

export interface SubscriberStats {
  newsletter: number;
  eventUpdates: number;
  newLast7: number;
  newLast30: number;
  leftLast30: number;
  inWelcomeSeries: number;
}

export interface IssueSummary {
  id: string;
  weekOf: string;
  status: string;
  subject: string;
  sentDate: string;
  recipients: number | null;
  /** Which sections are filled in, left to the automatic pick, or left out. */
  sections: { label: string; state: "set" | "auto" | "out" }[];
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export async function getSubscriberStats(): Promise<SubscriberStats | null> {
  if (!isAirtableConfigured(BASE_ID)) return null;
  const rows = await listRecords(SUBSCRIBERS, `{Brand} = '${DEFAULT_BRAND.replace(/'/g, "\\'")}'`, { baseId: BASE_ID });
  const active = rows.filter((r) => r.fields.State === "Active");
  const topics = (r: (typeof rows)[number]) => (r.fields.Topics as string[] | undefined) || [];
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  return {
    newsletter: active.filter((r) => topics(r).includes("Newsletter")).length,
    eventUpdates: active.filter((r) => topics(r).includes("Event Updates")).length,
    newLast7: active.filter((r) => str(r.fields["Subscribed Date"]) >= d7).length,
    newLast30: active.filter((r) => str(r.fields["Subscribed Date"]) >= d30).length,
    leftLast30: rows.filter((r) => str(r.fields["Unsubscribed Date"]) >= d30).length,
    inWelcomeSeries: active.filter((r) => Number(r.fields["Welcome Step"] || 0) < 5).length,
  };
}

function sectionsOf(f: Record<string, unknown>): IssueSummary["sections"] {
  const has = (k: string) => Boolean(str(f[k])) || (Array.isArray(f[k]) && (f[k] as unknown[]).length > 0);
  return [
    { label: "Feature story", state: has("Feature - Post URL") ? "set" : "auto" },
    { label: "Also this week", state: has("Also This Week - URL") ? "set" : "auto" },
    { label: "Trail Talk", state: has("Trail Talk - Title") && has("Trail Talk - Body") ? "set" : "out" },
    { label: "Upcoming event", state: has("Event - Title") ? "set" : "auto" },
    { label: "Rig of the week", state: has("Rig - Name") && has("Rig - Blurb") ? "set" : "out" },
    { label: "Anthony's vlog: feature", state: has("Quick Hits - Anthony Vlog URL") ? "set" : "out" },
    { label: "Anthony's vlog: other story", state: has("Quick Hits - Anthony Vlog 2 URL") ? "set" : "out" },
    { label: "Extra quick hit", state: has("Quick Hits - Custom Text") && has("Quick Hits - Custom URL") ? "set" : "out" },
    { label: "Second extra quick hit", state: has("Quick Hits - Custom 2 Text") && has("Quick Hits - Custom 2 URL") ? "set" : "out" },
    { label: "Featured video", state: has("Quick Hits - Video URL") ? "set" : "auto" },
    { label: "Merch", state: has("Quick Hits - Merch URL") ? "set" : "auto" },
  ];
}

export async function listIssues(): Promise<IssueSummary[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(ISSUES, undefined, { baseId: BASE_ID });
  return rows
    .map((r) => ({
      id: r.id,
      weekOf: str(r.fields["Week Of"]),
      status: str(r.fields.Status) || "Draft",
      subject: str(r.fields["Subject Sent"]),
      sentDate: str(r.fields["Sent Date"]),
      recipients: typeof r.fields.Recipients === "number" ? (r.fields.Recipients as number) : null,
      sections: sectionsOf(r.fields),
    }))
    .sort((a, b) => b.weekOf.localeCompare(a.weekOf));
}

/** This week's Monday (New York time), as YYYY-MM-DD. */
export function thisMonday(): string {
  const ny = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const d = new Date(`${ny}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Makes this week's Draft row, unless one already exists for the week. */
export async function startIssue(): Promise<string> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Newsletter base is not configured.");
  const monday = thisMonday();
  const existing = await listRecords(ISSUES, `IS_SAME({Week Of}, '${monday}', 'day')`, { baseId: BASE_ID });
  if (existing[0]) return existing[0].id;
  const row = await createRecord(ISSUES, { "Week Of": monday, Status: "Draft" }, { baseId: BASE_ID });
  return row.id;
}
