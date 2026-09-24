import crypto from "node:crypto";
import { SITE_URL } from "@/lib/site";

/**
 * A short-lived, signed link to one Media Library file, for Airtable to fetch
 * when a clip is put on a posting card (Garage → Library → Add to a posting
 * card).
 *
 * Why it exists: Airtable's upload API stops at 5 MB, and a vertical clip is
 * 20–35 MB, so a video can only reach a card by URL. The Drive files are
 * private and must stay that way — sharing them "anyone with the link" was
 * the alternative, and it changes who can see the file. This link is ours
 * instead: it only serves files the library lists, it dies after 15 minutes,
 * and the Drive sharing never changes. Airtable fetches it within seconds and
 * keeps its own copy.
 */
const TTL_SECONDS = 15 * 60;

function secret(): string {
  const s = process.env.ADMIN_API_SECRET;
  if (!s) throw new Error("ADMIN_API_SECRET is not configured.");
  return s;
}

const sign = (fileId: string, exp: number) =>
  crypto.createHmac("sha256", secret()).update(`media-link:${fileId}:${exp}`).digest("base64url");

export function signedMediaUrl(fileId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TTL_SECONDS;
  return `${SITE_URL}/api/media/link?id=${encodeURIComponent(fileId)}&exp=${exp}&sig=${sign(fileId, exp)}`;
}

export function verifyMediaLink(fileId: string, exp: string, sig: string, now = Date.now()): boolean {
  const expNum = Number(exp);
  if (!fileId || !Number.isFinite(expNum) || expNum < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(sign(fileId, expNum));
  const given = Buffer.from(sig || "");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
