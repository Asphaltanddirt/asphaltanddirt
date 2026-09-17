import { listRecords, createRecord, updateRecord, isAirtableConfigured, type AirtableFields } from "@/lib/airtable";

/**
 * Event photos as the crew sees them in A&D Garage.
 *
 * Photos come from two places — posts in Tailgate, and uploads on the event
 * page — and neither waits for approval. What the crew does to a photo lives
 * here in the Garage base as a "mark":
 *
 *   star  — a favourite. Starred photos are what we pull for the Community page.
 *   flag  — hides it from the site immediately, with a reason. Only an Owner
 *           can put it back, so anyone can act without anyone losing a photo.
 *
 * A photo with no mark is simply live. The Key says where the photo lives, so
 * marks survive Airtable's expiring attachment links.
 *
 *   describe — what the photo shows, used as its alt text on the site (WCAG
 *           1.1.1). Draft until someone approves it; never blocks a photo from
 *           showing. Matched by the attachment's own ID so it can't drift to
 *           another photo if the gallery is reordered.
 */

const BASE_ID = process.env.AIRTABLE_GARAGE_BASE_ID;
const TABLE = "Photo Marks";
const MARKS_CACHE_SECONDS = 60;
const MARKS_TAG = "garage-photo-marks";

export type FlagReason = "Kids / privacy" | "Inappropriate" | "Poor quality" | "Other";
export type DescriptionStatus = "Draft" | "Approved";

export interface PhotoMark {
  id: string;
  key: string;
  eventSlug: string;
  hidden: boolean;
  starredBy: string[];
  flagReason: FlagReason | null;
  flagNote: string;
  flaggedBy: string;
  attachmentId: string;
  description: string;
  descriptionStatus: DescriptionStatus | null;
}

function toMark(r: { id: string; fields: AirtableFields }): PhotoMark {
  return {
    id: r.id,
    key: (r.fields.Key as string) || "",
    eventSlug: (r.fields["Event Slug"] as string) || "",
    hidden: r.fields.Status === "Hidden",
    starredBy: ((r.fields["Starred By"] as string) || "")
      .split("\n")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    flagReason: (r.fields["Flag Reason"] as FlagReason) || null,
    flagNote: (r.fields["Flag Note"] as string) || "",
    flaggedBy: (r.fields["Flagged By"] as string) || "",
    attachmentId: (r.fields["Attachment ID"] as string) || "",
    description: ((r.fields.Description as string) || "").trim(),
    descriptionStatus: (r.fields["Description Status"] as DescriptionStatus) || null,
  };
}

/** Every mark. Small table, cached a minute, shared by the Garage and by the
 *  public gallery (which uses it to leave flagged photos out). */
export async function getPhotoMarks(): Promise<PhotoMark[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const records = await listRecords(TABLE, undefined, {
    baseId: BASE_ID,
    revalidate: MARKS_CACHE_SECONDS,
    tags: [MARKS_TAG],
  });
  return records.map(toMark);
}

/** Keys of photos that shouldn't appear anywhere public. */
export async function getHiddenPhotoKeys(): Promise<Set<string>> {
  const marks = await getPhotoMarks().catch(() => []);
  return new Set(marks.filter((m) => m.hidden).map((m) => m.key));
}

/** Approved descriptions by attachment ID, for the public galleries. */
export async function getApprovedPhotoDescriptions(): Promise<Map<string, string>> {
  const marks = await getPhotoMarks().catch(() => []);
  return new Map(
    marks
      .filter((m) => m.attachmentId && m.description && m.descriptionStatus === "Approved")
      .map((m) => [m.attachmentId, m.description]),
  );
}

async function findMark(key: string): Promise<PhotoMark | null> {
  if (!isAirtableConfigured(BASE_ID)) return null;
  const records = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  const match = records.map(toMark).find((m) => m.key === key);
  return match || null;
}

async function saveMark(existing: PhotoMark | null, key: string, fields: AirtableFields, seed: { eventSlug: string; photoUrl: string }) {
  const payload: AirtableFields = { ...fields, "Updated At": new Date().toISOString() };
  if (existing) {
    await updateRecord(TABLE, existing.id, payload, { baseId: BASE_ID });
    return;
  }
  await createRecord(
    TABLE,
    { Key: key, "Event Slug": seed.eventSlug, "Photo URL": seed.photoUrl, Status: "Live", ...payload },
    { baseId: BASE_ID, typecast: true },
  );
}

/** Star or unstar for one person. Star Count is written alongside so the table
 *  is readable at a glance; the email list is what's authoritative. */
export async function setStar(
  key: string,
  seed: { eventSlug: string; photoUrl: string },
  email: string,
  starred: boolean,
): Promise<number> {
  const existing = await findMark(key);
  const list = new Set(existing?.starredBy || []);
  const who = email.trim().toLowerCase();
  if (starred) list.add(who);
  else list.delete(who);
  const people = [...list];
  await saveMark(existing, key, { "Starred By": people.join("\n"), "Star Count": people.length }, seed);
  return people.length;
}

/** Flag hides it right away. Clearing a flag is an Owner-only call (checked by
 *  the route), and puts the photo straight back. */
export async function setFlag(
  key: string,
  seed: { eventSlug: string; photoUrl: string },
  email: string,
  flag: { reason: FlagReason; note: string } | null,
): Promise<void> {
  const existing = await findMark(key);
  await saveMark(
    existing,
    key,
    flag
      ? { Status: "Hidden", "Flag Reason": flag.reason, "Flag Note": flag.note.slice(0, 200), "Flagged By": email }
      : { Status: "Live", "Flag Reason": null, "Flag Note": "", "Flagged By": null },
    seed,
  );
}

/** Save a photo's description. `approve` puts it on the site; otherwise it's a
 *  draft that only the Garage shows. An empty description clears it. */
export async function setDescription(
  key: string,
  seed: { eventSlug: string; photoUrl: string },
  attachmentId: string,
  description: string,
  approve: boolean,
): Promise<void> {
  const existing = await findMark(key);
  const text = description.trim().slice(0, 500);
  await saveMark(
    existing,
    key,
    {
      "Attachment ID": attachmentId,
      Description: text,
      "Description Status": text ? (approve ? "Approved" : "Draft") : null,
    },
    seed,
  );
}
