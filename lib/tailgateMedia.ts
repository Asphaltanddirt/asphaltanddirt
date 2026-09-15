import crypto from "crypto";

/**
 * Photo and video posts in the Tailgate feed. Each file becomes its own
 * Messages row and its own Event Photo Submissions row (Source = Tailgate),
 * and the original goes browser → Google Drive exactly like event-page
 * uploads (lib/googleDrive.ts), into the event's Attendee Submissions folder:
 *
 *   POST /api/comms/[slug]/media/start     → rows + Drive folder + upload URLs
 *   POST /api/comms/[slug]/media/preview   → small preview (video: a still frame)
 *   POST /api/comms/[slug]/media/status    → resume offset after a dropped chunk
 *   POST /api/comms/[slug]/media/complete  → find the file in Drive, show the post
 *   GET  /api/comms/[slug]/media/file/[id] → stream the original (play / save)
 *
 * A post stays out of everyone's feed until complete marks it Ready.
 */

/** Files per post. Each file is several Airtable writes, and Airtable allows
 *  5 requests a second per base. */
export const MAX_FILES_PER_POST = 10;

/** Proves the phone holding it opened this post, so nobody can attach a
 *  preview to, or finish, someone else's upload. */
export function signMediaPost(messageId: string): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET is not configured.");
  return crypto.createHmac("sha256", secret).update(`tailgate-media:${messageId}`).digest("hex");
}

export function verifyMediaPost(messageId: unknown, token: unknown): messageId is string {
  if (typeof messageId !== "string" || typeof token !== "string" || !/^rec[A-Za-z0-9]{14}$/.test(messageId)) return false;
  const expected = Buffer.from(signMediaPost(messageId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** "IMG_1234.MOV" → "03 IMG_1234.MOV": unique inside the post's Drive folder,
 *  so complete can find exactly this file by name. */
export function driveNameFor(index: number, original: string): string {
  const clean = original.replace(/[\\/]/g, " ").trim().slice(0, 180) || "upload";
  return `${String(index + 1).padStart(2, "0")} ${clean}`;
}
