/**
 * The Media Library's fixed words, in a file with no server imports so the
 * upload screen and the Library screen (both client components) can use the
 * same list the server writes. Two copies of "Other footage" would drift.
 */

/**
 * What each upload choice files as Kind. Garage Takes were filed as "Vlog"
 * until 2026-09-24, when Jose asked for them to say what they are in the
 * library ("VLOG garage takes should be tagged as such"). Rows filed before
 * that still say "Vlog" and are left alone: rewriting history would break
 * anybody's saved Airtable view, and the Library screen treats both the same.
 */
export const KIND_LABEL = {
  event: "Event",
  vlog: "Garage Take",
  other: "Other footage",
} as const;
export type UploadKind = keyof typeof KIND_LABEL;

/** Kind as the Library shows and filters it: the old "Vlog" rows read as the
 *  Garage Takes they are. */
export function displayKind(kind: string): string {
  return kind === "Vlog" ? KIND_LABEL.vlog : kind;
}

/** The Event Type choices, in the order the screens show them. The same three
 *  as the locked dropdown in Airtable. */
export const EVENT_TYPES = ["Asphalt", "Dirt", "Both"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(v: unknown): v is EventType {
  return typeof v === "string" && (EVENT_TYPES as readonly string[]).includes(v);
}

/**
 * Above this, the Library offers "Open in Drive" instead of Download. Our
 * download route streams the file through a Vercel function, which is cut off
 * after 60 seconds — not long enough for a big video on event-day signal — and
 * a few hundred MB is a real bite out of a phone data plan. Drive's own app
 * handles big files better (resumable, Wi-Fi only if you like).
 */
export const DOWNLOAD_LIMIT_BYTES = 200 * 1024 * 1024;
