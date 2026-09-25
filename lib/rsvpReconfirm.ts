import crypto from "node:crypto";
import { listRecords, updateRecord } from "@/lib/airtable";
import { SITE_URL } from "@/lib/site";

/**
 * Re-confirming an RSVP after a postponement.
 *
 * Jose's rule: the waiver is NOT re-taken. It is signed and on file, and the
 * only thing that changed is the date — so approving the new date amends the
 * existing agreement rather than replacing it. What we do need is an answer
 * from each person, because a signature for one Saturday is not a commitment
 * to a different one.
 *
 * FLAT. One person, one answer, no cascade. The first design had a driver
 * dropping out taking their passengers off the list, which the data cannot
 * express — adult passengers hold their own RSVP with nothing linking them to
 * a driver. Jose settled it: everyone on the list is emailed, so everyone
 * answers for themselves. The passenger knows who they are riding with; we
 * don't, and don't need to.
 *
 * No token is stored. The link carries the record id and an HMAC, the same
 * pattern as the ambassador agreement links — nobody can guess someone else's
 * link, and there is no column to keep in step.
 */

const BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID || "app5LS6dvcTKdxGqr";
const RSVPS = "RSVPs";

export type ReconfirmAnswer = "Yes" | "No" | "Not sure";

function sign(recordId: string, date: string): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET is not configured.");
  // The date is inside the signature, so a link for one postponement cannot be
  // replayed against the next one.
  return crypto.createHmac("sha256", secret).update(`rsvp-reconfirm:${recordId}:${date}`).digest("base64url");
}

export function reconfirmLink(slug: string, recordId: string, newDate: string): string {
  try {
    return `${SITE_URL}/events/${slug}/confirm?id=${recordId}&d=${newDate}&t=${sign(recordId, newDate)}`;
  } catch {
    return `${SITE_URL}/events/${slug}`;
  }
}

export function verifyReconfirmLink(id: unknown, date: unknown, token: unknown): id is string {
  if (typeof id !== "string" || typeof date !== "string" || typeof token !== "string") return false;
  if (!/^rec[A-Za-z0-9]{14}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(sign(id, date));
  } catch {
    return false;
  }
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export interface RsvpForConfirm {
  id: string;
  name: string;
  email: string;
  status: string;
  answer: ReconfirmAnswer | "";
  answeredFor: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function getRsvpForConfirm(recordId: string): Promise<RsvpForConfirm | null> {
  const [row] = await listRecords(RSVPS, `RECORD_ID() = '${recordId}'`, { baseId: BASE_ID });
  if (!row) return null;
  return {
    id: row.id,
    name: str(row.fields.Name),
    email: str(row.fields.Email),
    status: str(row.fields.Status),
    answer: (str(row.fields["New Date Answer"]) as ReconfirmAnswer) || "",
    answeredFor: str(row.fields["Answered For"]).slice(0, 10),
  };
}

/**
 * Record the answer.
 *
 * A "No" also sets Status to Cancelled, so the RSVP list is true without
 * anybody tidying it by hand — which is the number staff read at the gate.
 * Changing a No back to a Yes puts them back on.
 */
export async function recordReconfirm(recordId: string, newDate: string, answer: ReconfirmAnswer): Promise<void> {
  await updateRecord(
    RSVPS,
    recordId,
    {
      "New Date Answer": answer,
      "Answered For": newDate,
      "Answered At": new Date().toISOString(),
      Status: answer === "No" ? "Cancelled" : "Confirmed",
    },
    { baseId: BASE_ID },
  );
}

/** Everyone who still has not answered about the current date. With the day
 *  it was postponed, people who RSVP'd after that are left out: RSVPing to
 *  the new date already answers it. */
export async function pendingReconfirms(eventRecordId: string, eventDate: string, postponedOn = "") {
  const rows = await listRecords(RSVPS, "", { baseId: BASE_ID });
  return rows
    .filter((r) => ((r.fields.Event as string[]) || []).includes(eventRecordId))
    .filter((r) => str(r.fields.Status) === "Confirmed")
    // An answer about a previous date says nothing about this one.
    .filter((r) => str(r.fields["Answered For"]).slice(0, 10) !== eventDate)
    .filter((r) => !postponedOn || !str(r.fields["RSVP Date"]) || str(r.fields["RSVP Date"]).slice(0, 10) <= postponedOn)
    .map((r) => ({ id: r.id, name: str(r.fields.Name), email: str(r.fields.Email) }))
    .filter((r) => r.email);
}
