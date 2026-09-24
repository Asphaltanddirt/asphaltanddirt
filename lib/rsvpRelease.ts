import crypto from "node:crypto";
import { listRecords, updateRecord } from "@/lib/airtable";
import { SITE_URL } from "@/lib/site";

/**
 * "Release your spot", from the day-before reminder (event promo countdown,
 * 2026-09-24). Someone who can't make it tells us in one tap, and the RSVP
 * list staff read at the gate is true without anybody tidying it by hand.
 *
 * Same pattern as the re-confirm link (lib/rsvpReconfirm.ts): the link carries
 * the RSVP record id and an HMAC, no token is stored, and nobody can guess
 * someone else's link. The event date is inside the signature, so a link from
 * before a postponement can't release a spot on the new date.
 *
 * The page never releases on load. Mail scanners open links to check them, and
 * a GET that cancelled an RSVP would cancel people who never tapped anything.
 * The page asks; the button does it.
 */

const BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID || "app5LS6dvcTKdxGqr";
const RSVPS = "RSVPs";

function sign(recordId: string, date: string): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET is not configured.");
  // A different prefix from the re-confirm signature, so one link can never
  // be replayed as the other.
  return crypto.createHmac("sha256", secret).update(`rsvp-release:${recordId}:${date}`).digest("base64url");
}

export function releaseLink(slug: string, recordId: string, eventDate: string): string {
  try {
    return `${SITE_URL}/events/${slug}/release?id=${recordId}&d=${eventDate}&t=${sign(recordId, eventDate)}`;
  } catch {
    return "";
  }
}

export function verifyReleaseLink(id: unknown, date: unknown, token: unknown): id is string {
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

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function getRsvpForRelease(recordId: string): Promise<{ id: string; name: string; status: string; eventIds: string[] } | null> {
  const [row] = await listRecords(RSVPS, `RECORD_ID() = '${recordId}'`, { baseId: BASE_ID });
  if (!row) return null;
  return { id: row.id, name: str(row.fields.Name), status: str(row.fields.Status), eventIds: (row.fields.Event as string[]) || [] };
}

/**
 * Release (or take back) the spot. Releasing sets Status to Cancelled, which
 * is what every list and email already reads, so they all drop the person at
 * once. Taking it back puts them on again: the D−1 email lands the night
 * before, and "actually, I can make it" by morning is a real thing.
 *
 * `Released At` is new; if the field isn't in Airtable yet the status change
 * still goes through.
 */
export async function setReleased(recordId: string, released: boolean): Promise<void> {
  const status = { Status: released ? "Cancelled" : "Confirmed" };
  try {
    await updateRecord(RSVPS, recordId, { ...status, "Released At": released ? new Date().toISOString() : null }, { baseId: BASE_ID });
  } catch (err) {
    if (!/UNKNOWN_FIELD_NAME/.test(err instanceof Error ? err.message : "")) throw err;
    await updateRecord(RSVPS, recordId, status, { baseId: BASE_ID });
  }
}
