import crypto from "crypto";
import { listRecords, updateRecord } from "@/lib/airtable";

/**
 * Shared rules for visitor photo/video submissions on past events
 * (/events/[slug] → "Got Photos From The Day?"). The upload itself goes browser
 * → Google Drive (lib/googleDrive.ts); these API steps just open it, attach
 * photo previews, and close it out:
 *
 *   POST /api/event-media/start     → Airtable row + Drive folder + upload URLs
 *   POST /api/event-media/preview   → small photo copy onto the row (gallery)
 *   POST /api/event-media/status    → resume offset after a dropped chunk
 *   POST /api/event-media/complete  → count what arrived, mark row, email team
 */

export const MEDIA_BASE_ID = process.env.AIRTABLE_EVENTS_BASE_ID;
export const MEDIA_TABLE = "Event Photo Submissions";

export const MAX_FILES = 25;
export const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024 * 1024;
export const MAX_PREVIEWS = 12;
export const MAX_PREVIEW_BYTES = 3.5 * 1024 * 1024;

/** Page origins allowed to open upload sessions (Google ties each session to one). */
const ALLOWED_ORIGINS = new Set([
  "https://www.asphaltanddirt.com",
  "https://asphaltanddirt.com",
  "http://localhost:3000",
  "http://localhost:3001",
]);

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Vercel preview deployments of this project.
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin;
  return null;
}

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  mov: "video/quicktime",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
};

/** Phones sometimes report an empty type for HEIC/MOV — fall back to the extension. */
export function resolveMediaType(name: string, reported: string): { mimeType: string; kind: "photo" | "video" } | null {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const mimeType = reported || EXTENSION_TYPES[ext] || "";
  if (mimeType.startsWith("image/")) return { mimeType, kind: "photo" };
  if (mimeType.startsWith("video/")) return { mimeType, kind: "video" };
  return null;
}

/** A submission's capability token: proves the browser holding it opened this
 *  row, so nobody can attach to or close out someone else's submission. */
export function signSubmission(recordId: string): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET is not configured.");
  return crypto.createHmac("sha256", secret).update(`event-media:${recordId}`).digest("hex");
}

export function verifySubmission(recordId: unknown, token: unknown): recordId is string {
  if (typeof recordId !== "string" || typeof token !== "string" || !/^rec[A-Za-z0-9]{14}$/.test(recordId)) return false;
  const expected = Buffer.from(signSubmission(recordId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export async function getSubmission(recordId: string) {
  const records = await listRecords(MEDIA_TABLE, `RECORD_ID() = '${recordId}'`, { baseId: MEDIA_BASE_ID });
  return records[0] ?? null;
}

export function folderIdFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  return url.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

export async function updateSubmission(recordId: string, fields: Record<string, unknown>) {
  await updateRecord(MEDIA_TABLE, recordId, fields, { baseId: MEDIA_BASE_ID });
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface PendingPhoto {
  submissionId: string;
  index: number;
  url: string;
  name: string;
  source: string;
  permissionNotes: string;
  submittedAt: string;
}

/** Photos waiting for staff approval before the public gallery: not yet
 *  approved, not rejected, finished uploading. One entry per photo file;
 *  approval is per submission (a Tailgate post is one photo per submission). */
export async function getPendingPhotos(eventRecordId: string): Promise<PendingPhoto[]> {
  const records = await listRecords(
    MEDIA_TABLE,
    `AND(NOT({Approved}), NOT({Rejected}), {Upload Status} = 'Complete')`,
    { baseId: MEDIA_BASE_ID },
  );
  const out: PendingPhoto[] = [];
  for (const r of records) {
    if (!((r.fields.Event as string[]) || []).includes(eventRecordId)) continue;
    ((r.fields.Photo as { url: string; thumbnails?: { large?: { url: string } } }[] | undefined) || []).forEach((p, i) => {
      out.push({
        submissionId: r.id,
        index: i,
        url: p.thumbnails?.large?.url || p.url,
        name: (r.fields.Name as string) || "Someone",
        source: (r.fields.Source as string) || "Event page",
        permissionNotes: (r.fields["Permission Notes"] as string) || "",
        submittedAt: r.createdTime,
      });
    });
  }
  return out.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

/** Staff decision on a submission: approve publishes it to the gallery,
 *  reject keeps it off (and starts the 90-day deletion clock). */
export async function reviewSubmission(recordId: string, decision: "approve" | "reject", by: string) {
  await updateRecord(
    MEDIA_TABLE,
    recordId,
    decision === "approve"
      ? { Approved: true, Rejected: false, "Reviewed By": by, "Reviewed At": new Date().toISOString() }
      : { Approved: false, Rejected: true, "Reviewed By": by, "Reviewed At": new Date().toISOString() },
    { baseId: MEDIA_BASE_ID },
  );
}
