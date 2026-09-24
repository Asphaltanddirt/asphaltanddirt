import { createRecord, listRecords, isAirtableConfigured } from "@/lib/airtable";
import { getEventBySlug } from "@/lib/events";
import { KIND_LABEL, type UploadKind } from "@/lib/mediaKinds";

/**
 * The media library (Jose, 2026-09-22): "we need a way to tag raw footage so we
 * can look back at things months later and remember what vehicle is in what".
 *
 * The design is his, and it is deliberately small — KISS. One row per uploaded
 * file, one plain text field of keywords, and Airtable's own search box is the
 * dashboard. No naming convention, no controlled vocabulary, no new app to log
 * into.
 *
 * WHERE THE TRUTH LIVES: Drive holds the file, always. This table is an index
 * that points at it, keyed on the Drive **file id**, which survives a rename
 * and a move — and A&D moves footage on purpose (Trail Runs → Youtube drive →
 * the edit Mac). A folder path would not survive that; the id does.
 *
 * KEYWORDS ARE FREE TEXT, ON PURPOSE. "Jeep", "jeeps" and "JL" will all appear
 * and that is fine: search catches near misses, and friction is what kills the
 * habit. That reasoning applies to a human typing on a phone. If an AI ever
 * fills these in, it needs a fixed list instead — a model will happily invent
 * "recovery", "winching" and "vehicle recovery" for the same thing — which is
 * why its tags go in a SEPARATE field (see below) rather than over the top of
 * somebody's own words.
 */

const BASE_ID = process.env.AIRTABLE_ANALYTICS_BASE_ID || "appzbX0Mz3rXtc1GN";
const TABLE = "Media Library";

export interface MediaRowInput {
  fileName: string;
  fileId: string;
  size?: number;
  mimeType?: string;
}

export interface MediaBatch {
  kind: UploadKind;
  label: string;
  folderId: string;
  keywords: string;
  thoughts: string;
  uploadedBy: string;
  /** Asphalt / Dirt / Both: seeded from the event, or tapped by hand for
   *  Other footage (there is no event to seed it from). The primary tag. */
  eventType?: string;
  /** The event's Venue Type(s), seeded. The second primary tag. */
  venueTypes?: string[];
}

export interface MediaRow {
  id: string;
  fileName: string;
  fileId: string;
  driveLink: string;
  kind: string;
  label: string;
  uploadedBy: string;
  uploadedAt: string;
  keywords: string;
  aiKeywords: string;
  thoughts: string;
  /** "" when the row has none (older rows, and Garage Takes). */
  eventType: string;
  venueTypes: string[];
  /** Bytes, when the uploader's browser reported it. 0 = not known. */
  size: number;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Keywords read back as either a string or a list, depending on whether the
 *  Airtable field is text or multi-select. Jose made it a multi-select
 *  (2026-09-22), which is better than text — tapping a tag in Airtable shows
 *  every clip carrying it, which is the dashboard he wanted — but it means a
 *  plain `typeof === "string"` read comes back empty. Handle both. */
const tags = (v: unknown): string =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).join(", ") : str(v);

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : str(v) ? [str(v)] : [];

export const driveFileUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`;
export const driveFolderUrl = (folderId: string) => `https://drive.google.com/drive/folders/${folderId}`;

/** Tidies what someone typed into comma-separated words, without policing it.
 *  Lowercased so "Jeep" and "jeep" match, duplicates dropped, order kept. */
export function cleanKeywords(raw: string): string {
  const seen = new Set<string>();
  return raw
    .split(/[,\n;]+/)
    .map((k) => k.trim().toLowerCase().replace(/\s+/g, " "))
    .filter((k) => k.length > 0 && k.length <= 40)
    .filter((k) => (seen.has(k) ? false : seen.add(k)))
    .slice(0, 30)
    .join(", ");
}

/**
 * Files one row per uploaded file.
 *
 * NEVER throws into the upload path. The files are already safely in Drive by
 * the time this runs; an Airtable hiccup (or the table not existing yet) must
 * not turn a finished upload into an error on someone's phone. It reports what
 * happened and the caller ignores it.
 */
export async function fileMediaRows(
  files: MediaRowInput[],
  batch: MediaBatch,
): Promise<{ filed: number; skipped?: string }> {
  if (!isAirtableConfigured(BASE_ID)) return { filed: 0, skipped: "Airtable isn't configured" };
  const keywords = cleanKeywords(batch.keywords);
  const thoughts = batch.thoughts.trim().slice(0, 2000);
  // The two primary tags come from the event, not from whoever is uploading —
  // locked dropdowns so the content plan can count on them (see the field
  // descriptions in Airtable). A file that carries a seeded tag is worth a row
  // even when nobody typed a word, which is most uploads: the whole point is
  // that footage arrives already sorted into the bucket a slot draws from.
  const eventType = (batch.eventType || "").trim();
  const venueTypes = (batch.venueTypes || []).map((v) => v.trim()).filter(Boolean);
  // Nothing typed, nothing to say, and nothing seeded: don't fill the table
  // with rows that say nothing at all. That only applies to event footage,
  // which can always be found again through its event's folder. A Garage Take
  // or a random clip has no event to find it by, so its row IS how it gets
  // found — those are always filed, even with every box left blank.
  if (batch.kind === "event" && !keywords && !thoughts && !eventType) return { filed: 0, skipped: "Nothing typed" };

  const uploadedAt = new Date().toISOString();
  let filed = 0;
  for (const f of files) {
    if (!f.fileId) continue;
    try {
      await createRecord(
        TABLE,
        {
          "File Name": f.fileName,
          "Drive File ID": f.fileId,
          "Drive Link": driveFileUrl(f.fileId),
          "Folder Link": driveFolderUrl(batch.folderId),
          // typecast (below) adds a choice the dropdown doesn't have yet, so
          // "Garage Take" and "Other footage" appear on their first write.
          Kind: KIND_LABEL[batch.kind],
          Label: batch.label,
          "Uploaded By": batch.uploadedBy,
          "Uploaded At": uploadedAt,
          // Only send what was actually typed. An empty string sent to a
          // multi-select creates a blank option that then sits in the field's
          // list forever — the write test made exactly that mess.
          ...(eventType ? { "Event Type": eventType } : {}),
          ...(venueTypes.length ? { "Venue Type": venueTypes } : {}),
          ...(keywords ? { Keywords: keywords } : {}),
          ...(thoughts ? { Thoughts: thoughts } : {}),
          ...(f.size ? { Size: f.size } : {}),
        },
        { baseId: BASE_ID, typecast: true },
      );
      filed++;
    } catch (err) {
      console.error("media library: couldn't file", f.fileName, err);
      return { filed, skipped: err instanceof Error ? err.message.slice(0, 120) : "Airtable write failed" };
    }
  }
  return { filed };
}

/**
 * Files footage that arrived some other way than Garage → Upload: an attendee's
 * event-page upload, or a photo/video posted in Tailgate. Both already belong to
 * one event, so the two primary tags are seeded exactly as Garage Upload seeds
 * them, and the footage counts toward the library from the moment it lands.
 * Found missing 9/24, two days before the Mud Run — the first real upload day.
 *
 * `expectEventId` guards the one input a browser supplies (the slug): if it
 * resolves to a different event than the submission was made for, nothing is
 * seeded rather than tagging the file with the wrong event.
 */
export async function fileEventFootage(
  files: MediaRowInput[],
  opts: { slug: string; folderId: string; uploadedBy: string; expectEventId?: string },
): Promise<{ filed: number; skipped?: string }> {
  try {
    const found = opts.slug ? await getEventBySlug(opts.slug, { includeCrewOnly: true }).catch(() => null) : null;
    const event = found && (!opts.expectEventId || found.id === opts.expectEventId) ? found : null;
    return await fileMediaRows(files, {
      kind: "event",
      label: event?.title || opts.slug,
      folderId: opts.folderId,
      keywords: "",
      thoughts: "",
      uploadedBy: opts.uploadedBy,
      eventType: event?.eventType,
      venueTypes: event?.venueTypes,
    });
  } catch (err) {
    return { filed: 0, skipped: err instanceof Error ? err.message.slice(0, 120) : "failed" };
  }
}

function toMediaRow(r: { id: string; fields: Record<string, unknown> }): MediaRow {
  const f = r.fields;
  return {
    id: r.id,
    fileName: str(f["File Name"]),
    fileId: str(f["Drive File ID"]),
    driveLink: str(f["Drive Link"]),
    kind: str(f.Kind),
    label: str(f.Label),
    uploadedBy: str(f["Uploaded By"]),
    uploadedAt: str(f["Uploaded At"]),
    keywords: tags(f.Keywords),
    aiKeywords: tags(f["AI Keywords"]),
    thoughts: str(f.Thoughts),
    eventType: str(f["Event Type"]),
    venueTypes: list(f["Venue Type"]),
    size: typeof f.Size === "number" && f.Size > 0 ? f.Size : 0,
  };
}

/** Everything filed, newest first: Garage → Library reads this. Only rows that
 *  point at an actual Drive file — the library shows what's there, never what
 *  was planned, and a row with no file id has nothing to show or download. */
export async function getMediaLibrary(): Promise<MediaRow[]> {
  if (!isAirtableConfigured(BASE_ID)) return [];
  const rows = await listRecords(TABLE, undefined, { baseId: BASE_ID });
  return rows
    .map(toMediaRow)
    .filter((r) => r.fileId)
    .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
}

// A short-lived copy of the library's file ids, per warm function. The Library
// grid asks for two dozen thumbnails at once and Airtable allows five requests
// a second per base, so looking each one up would get most of them refused.
let fileCache: { at: number; byFileId: Map<string, MediaRow> } | null = null;
const FILE_CACHE_MS = 5 * 60 * 1000;
/** A miss refreshes the copy (a file uploaded a minute ago), but no more often
 *  than this, so a bad id can't be used to hammer Airtable. */
const MISS_REFRESH_MS = 30 * 1000;

async function loadFileCache() {
  const rows = await getMediaLibrary();
  fileCache = { at: Date.now(), byFileId: new Map(rows.map((r) => [r.fileId, r])) };
  return fileCache;
}

/**
 * The library row for a Drive file id, or null if it isn't in the library.
 *
 * This is the guard on the thumbnail and download routes. The Drive token can
 * read everything team@ can, finance folders included, so those routes must
 * only ever hand out files the library actually lists — never any id someone
 * types into a URL.
 */
export async function findMediaByFileId(fileId: string): Promise<MediaRow | null> {
  if (!fileId) return null;
  let cache = fileCache;
  if (!cache || Date.now() - cache.at > FILE_CACHE_MS) cache = await loadFileCache();
  const hit = cache.byFileId.get(fileId);
  if (hit) return hit;
  if (Date.now() - cache.at > MISS_REFRESH_MS) cache = await loadFileCache();
  return cache.byFileId.get(fileId) ?? null;
}

/** Read-only: is the table there, and how much is in it? */
export async function checkMediaLibrary(): Promise<Record<string, unknown>> {
  try {
    const rows = await listRecords(TABLE, undefined, { baseId: BASE_ID });
    const tagged = rows.filter((r) => tags(r.fields.Keywords)).length;
    return { table: `ok — ${rows.length} rows`, tagged };
  } catch (err) {
    return {
      table: `MISSING — create a "${TABLE}" table in the Analytics base`,
      fields: "File Name · Drive File ID · Drive Link · Folder Link · Kind · Label · Uploaded By · Uploaded At · Keywords · Thoughts · Size (number) · AI Keywords · Event Type · Venue Type",
      detail: err instanceof Error ? err.message.slice(0, 120) : "",
    };
  }
}
