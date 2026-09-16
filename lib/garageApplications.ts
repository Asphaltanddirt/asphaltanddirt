import { listRecords, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

/**
 * Road & Trail Crew applications, for the owners' review screen in A&D Garage.
 * The Applications table lives in the Road & Trail Crew base (AIRTABLE_BASE_ID).
 *
 * The decision is the "Review Decision" field. Setting it to the Accept choice
 * fires the Airtable automation "Auto-create Ambassador on Accept", which
 * creates the Ambassadors record; the Part 1 welcome email still waits for
 * someone to tick Send Welcome 1 on that record.
 */

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_APPLICATIONS_TABLE || "Applications";

export const DECISIONS = [
  "Accept — Road & Trail Member",
  "Hold / Second Review",
  "Decline",
  "Exceptional Candidate / Crew Review",
] as const;
export type Decision = (typeof DECISIONS)[number];

export interface Application {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  applied: string;
  decision: Decision | "";
  status: string;
  score: number | null;
  photo: string;
  buildPhotos: string[];
  facts: { label: string; value: string }[];
}

const TEXT_FIELDS: [string, string][] = [
  ["Primary Vehicle / Build", "Vehicle / build"],
  ["Build Description", "Build description"],
  ["Why A&D", "Why A&D"],
  ["Culture Vision", "What they want the culture to become"],
  ["Culture Areas", "Culture areas"],
  ["Interest Areas", "Interest areas"],
  ["Primary Social Handle", "Primary social handle"],
  ["Social Links", "Social links"],
  ["Content Portfolio Links", "Content portfolio"],
  ["Content Types", "Content types"],
  ["Content Frequency", "Posts"],
  ["Audience Size", "Audience size"],
  ["Engagement / Audience Info", "Engagement / audience"],
  ["Monthly Content Commitment", "Monthly content commitment"],
  ["Monthly Media Commitment", "Monthly media commitment"],
  ["Commitment Notes", "Commitment notes"],
  ["Event Representation", "Event representation"],
  ["Clubs / Events / Communities", "Clubs / events / communities"],
  ["Non-Sales Contribution", "Non-sales contribution"],
  ["Other Brand Relationships", "Other brand relationships"],
  ["Meaningful Engagement", "Meaningful engagement"],
  ["Additional Info", "Additional info"],
  ["Reviewer Notes", "Reviewer notes"],
];

function text(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" && x ? (x as { name?: string }).name || "" : String(x))).filter(Boolean).join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return v === undefined || v === null ? "" : String(v).trim();
}

function toApplication(r: { id: string; createdTime?: string; fields: AirtableFields }): Application {
  const f = r.fields;
  const attachments = (v: unknown) => ((v as { url: string; thumbnails?: { large?: { url: string } } }[] | undefined) || []).map((a) => a.thumbnails?.large?.url || a.url);
  const score = Number(f["Weighted Score"]);
  return {
    id: r.id,
    name: text(f.Name) || "(no name)",
    email: text(f.Email),
    phone: text(f.Phone),
    location: text(f.Location),
    applied: (r.createdTime || "").slice(0, 10),
    decision: (text(f["Review Decision"]) as Decision) || "",
    status: text(f.Status),
    score: Number.isFinite(score) && f["Weighted Score"] !== undefined ? score : null,
    photo: attachments(f["Ambassador Photo"])[0] || "",
    buildPhotos: attachments(f["Build Photo(s)"]),
    facts: TEXT_FIELDS.map(([field, label]) => ({ label, value: text(f[field]) })).filter((x) => x.value),
  };
}

export async function listApplications(): Promise<Application[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const records = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  return records.map(toApplication).sort((a, b) => b.applied.localeCompare(a.applied));
}

export async function getApplication(id: string): Promise<Application | null> {
  if (!isAirtableConfigured(BASE_ID) || !/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  const records = await listRecords(TABLE, `RECORD_ID() = '${id}'`, { baseId: BASE_ID });
  return records[0] ? toApplication(records[0]) : null;
}

export async function setDecision(id: string, decision: Decision | null): Promise<void> {
  if (!isAirtableConfigured(BASE_ID)) throw new Error("Road & Trail Crew base is not configured.");
  await updateRecord(TABLE, id, { "Review Decision": decision }, { baseId: BASE_ID });
}

/** Waiting on a decision: no Review Decision yet, or put on hold. */
export function isWaiting(app: Application) {
  return !app.decision || app.decision === "Hold / Second Review" || app.decision === "Exceptional Candidate / Crew Review";
}
