/**
 * Google Drive for event media, in the "A&D Trail Runs" Shared Drive. Every
 * event gets one folder with the same layout (Drive protocol, 2026-09-17):
 *
 *   YYYY.MM.DD - Event Title /
 *     1. Staff Uploads /         one folder per crew member who marks Going
 *     2. Attendee Submissions /  <date time - Name (Source)> per upload
 *     3. Best Of /               picks for the gallery, social and recap
 *     4. Event Docs /            flyer, route map, permits
 *
 * The hourly event-drive cron makes the folders as soon as an event has a Title
 * and Date (link saved on Events → Drive Folder), or the first upload does if
 * that hasn't run yet. Older folder names are recognised and renamed to the
 * standard ones. Rosters, waivers and emergency contacts never go in Drive.
 *
 * Files never pass through our server: we open a resumable upload session per
 * file and the visitor's browser PUTs the bytes straight to Google, so Vercel's
 * ~4.5MB request limit doesn't apply and phone videos work.
 *
 * Auth is a Drive-only refresh token for team@ (GOOGLE_DRIVE_REFRESH_TOKEN),
 * kept separate from the analytics token so neither can break the other.
 * Mint it with: GOOGLE_TOKEN_PURPOSE=drive node scripts/get-google-refresh-token.mjs
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** The standard subfolders, in order, with the older names each one replaces. */
export const EVENT_FOLDER_LAYOUT = [
  { name: "1. Staff Uploads", aliases: ["A&D Team Uploads", "Staff Submissions", "Staff Uploads"] },
  { name: "2. Attendee Submissions", aliases: ["Attendee Submissions"] },
  { name: "3. Best Of", aliases: ["Best Photo & Videos", "Best Photos & Videos", "Best Of"] },
  { name: "4. Event Docs", aliases: ["Event Docs"] },
] as const;
export type EventSubfolder = (typeof EVENT_FOLDER_LAYOUT)[number]["name"];

export function isDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_EVENTS_DRIVE_ID,
  );
}

function driveId() {
  return process.env.GOOGLE_DRIVE_EVENTS_DRIVE_ID!;
}

// Access tokens last an hour; reuse one across requests on a warm function.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }).toString(),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google Drive token refresh failed: ${res.status} ${JSON.stringify(data)}`);
  cachedToken = { value: data.access_token as string, expiresAt: Date.now() + (data.expires_in as number) * 1000 };
  return cachedToken.value;
}

async function driveJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Drive request failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

function escapeQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function listChildren(parentId: string, extraQuery = "", inDrive = driveId()): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${escapeQuery(parentId)}' in parents and trashed = false${extraQuery ? ` and ${extraQuery}` : ""}`,
      corpora: "drive",
      driveId: inDrive,
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await driveJson<{ files: DriveFile[]; nextPageToken?: string }>(`/files?${params.toString()}`);
    files.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return files;
}

async function createFolder(name: string, parentId: string): Promise<string> {
  const folder = await driveJson<DriveFile>(`/files?supportsAllDrives=true&fields=id`, {
    method: "POST",
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  return folder.id;
}

/** Moves a file or folder to the Shared Drive's trash (Drive empties it after
 *  30 days). Used by the retention cron for rejected submissions. */
export async function trashDriveItem(fileId: string): Promise<void> {
  await driveJson<DriveFile>(`/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true }),
  });
}

export function folderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/** "2026-09-26" -> "2026.09.26", the prefix the team names event folders with. */
function eventFolderPrefix(isoDate: string) {
  return isoDate.slice(0, 10).replace(/-/g, ".");
}

/** Case, spacing and punctuation don't matter when matching folder names. */
function sameName(a: string, b: string) {
  const norm = (v: string) => v.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
  return norm(a) === norm(b);
}

function safeFolderName(value: string) {
  return value.replace(/[\\/]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** The folder ID inside a Drive folder link, if it is one. */
export function folderIdFromUrl(url: string | null | undefined): string | null {
  const match = (url || "").match(/\/folders\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

async function renameItem(fileId: string, name: string): Promise<void> {
  await driveJson<DriveFile>(`/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

async function getItem(fileId: string): Promise<(DriveFile & { trashed?: boolean }) | null> {
  try {
    return await driveJson<DriveFile & { trashed?: boolean }>(
      `/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,trashed`,
    );
  } catch {
    return null;
  }
}

export interface EventForDrive {
  date: string;
  title: string;
  /** Events → Drive Folder, when it's already been set. */
  driveFolderUrl?: string | null;
}

/**
 * The event's folder: the saved Drive Folder link first; otherwise the
 * top-level folder with the event's date prefix (the rest of the name can be
 * edited freely). If two events share a date, the one whose name matches the
 * title wins; with no clear match a new folder is made rather than mixing two
 * events' files.
 */
async function findEventFolder(event: EventForDrive): Promise<DriveFile | null> {
  const savedId = folderIdFromUrl(event.driveFolderUrl);
  if (savedId) {
    const saved = await getItem(savedId);
    if (saved && !saved.trashed) return saved;
  }
  const prefix = eventFolderPrefix(event.date);
  const candidates = (
    await listChildren(driveId(), `mimeType = '${FOLDER_MIME}' and name contains '${escapeQuery(prefix)}'`)
  ).filter((f) => f.name.startsWith(prefix));
  if (candidates.length <= 1) return candidates[0] || null;
  const title = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return (
    candidates.find((f) => {
      const rest = f.name.slice(prefix.length).toLowerCase().replace(/[^a-z0-9]+/g, "");
      return rest && (rest.includes(title) || title.includes(rest));
    }) || null
  );
}

/**
 * Makes sure the event's folder and its four standard subfolders exist, and
 * returns their IDs. Safe to run again and again: existing folders are reused,
 * old names are renamed to the standard ones, and nothing is moved or deleted.
 */
export async function ensureEventFolders(
  event: EventForDrive,
): Promise<{ eventFolderId: string; subfolders: Record<EventSubfolder, string> }> {
  const prefix = eventFolderPrefix(event.date);
  const found = await findEventFolder(event);
  const eventFolderId = found
    ? found.id
    : await createFolder(`${prefix} - ${safeFolderName(event.title) || "Event"}`, driveId());

  const existing = found ? await listChildren(eventFolderId, `mimeType = '${FOLDER_MIME}'`) : [];
  const subfolders = {} as Record<EventSubfolder, string>;
  for (const slot of EVENT_FOLDER_LAYOUT) {
    const exact = existing.find((f) => sameName(f.name, slot.name));
    if (exact) {
      subfolders[slot.name] = exact.id;
      continue;
    }
    const older = existing.find((f) => slot.aliases.some((alias) => sameName(f.name, alias)));
    if (older) {
      await renameItem(older.id, slot.name);
      subfolders[slot.name] = older.id;
      continue;
    }
    subfolders[slot.name] = await createFolder(slot.name, eventFolderId);
  }
  return { eventFolderId, subfolders };
}

/** Where visitor and Tailgate uploads go: the event's "2. Attendee Submissions". */
export async function getAttendeeSubmissionsFolder(event: EventForDrive): Promise<string> {
  const { subfolders } = await ensureEventFolders(event);
  return subfolders["2. Attendee Submissions"];
}

/** A crew member's own folder under "1. Staff Uploads", made when they mark
 *  Going. Matched by name, so answering twice never makes a second one. */
export async function ensureStaffFolder(event: EventForDrive, personName: string): Promise<string> {
  const { subfolders } = await ensureEventFolders(event);
  const parent = subfolders["1. Staff Uploads"];
  const name = safeFolderName(personName) || "Crew";
  const existing = await listChildren(parent, `mimeType = '${FOLDER_MIME}'`);
  const match = existing.find((f) => sameName(f.name, name));
  return match ? match.id : createFolder(name, parent);
}

/** One folder per submission, e.g. "2026-09-27 18.42 - Bob Smith". */
export async function createSubmissionFolder(parentId: string, submitterName: string): Promise<string> {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(",", "")
    .replace(":", ".");
  const safeName = submitterName.replace(/[\\/]/g, " ").trim().slice(0, 80) || "Submission";
  return createFolder(`${stamp} - ${safeName}`, parentId);
}

/**
 * Opens a resumable upload session for one file and returns its upload URL.
 * `origin` must be the visitor's page origin — Google only allows the browser
 * to PUT to the session from the origin that opened it.
 */
export async function createUploadSession(input: {
  folderId: string;
  name: string;
  mimeType: string;
  size: number;
  origin: string;
}): Promise<string> {
  const res = await fetch(`${UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": input.mimeType,
      "X-Upload-Content-Length": String(input.size),
      Origin: input.origin,
    },
    body: JSON.stringify({ name: input.name, parents: [input.folderId] }),
    cache: "no-store",
  });
  const location = res.headers.get("location");
  if (!res.ok || !location) throw new Error(`Google Drive upload session failed: ${res.status} ${await res.text()}`);
  return location;
}

/**
 * How many bytes of a resumable upload Google has confirmed, so an upload
 * interrupted mid-chunk can continue from there. (The browser can't read
 * Google's Range header itself, so it asks us.)
 */
export async function getUploadOffset(uploadUrl: string, size: number): Promise<{ offset: number; done: boolean }> {
  if (!uploadUrl.startsWith(`${UPLOAD_API}/files?`)) throw new Error("Not a Drive upload URL.");
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Range": `bytes */${size}`, "Content-Length": "0" },
    cache: "no-store",
  });
  if (res.status === 200 || res.status === 201) return { offset: size, done: true };
  if (res.status === 308) {
    const range = res.headers.get("range"); // "bytes=0-1048575"
    const end = range ? Number(range.split("-")[1]) : -1;
    return { offset: end + 1, done: false };
  }
  throw new Error(`Google Drive upload status failed: ${res.status}`);
}

/** Everything that actually arrived in a submission folder. */
export async function listSubmissionFiles(folderId: string): Promise<DriveFile[]> {
  return listChildren(folderId, `mimeType != '${FOLDER_MIME}'`);
}

/** One named file in a folder, once its upload has finished. */
export async function findFileInFolder(folderId: string, name: string): Promise<DriveFile | null> {
  const files = await listChildren(folderId, `name = '${escapeQuery(name)}' and mimeType != '${FOLDER_MIME}'`);
  return files[0] ?? null;
}

/**
 * The raw bytes of a Drive file, passing the browser's Range header through so
 * a <video> can seek and a long download can resume. Tailgate streams originals
 * this way: the Shared Drive stays private, and our route checks who's asking
 * before anything is fetched.
 */
export async function fetchDriveMedia(fileId: string, range: string | null): Promise<Response> {
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) throw new Error("Not a Drive file ID.");
  return fetch(`${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(range ? { Range: range } : {}) },
    cache: "no-store",
  });
}

// ---------------------------------------------------------------------------
// Vlogs: the "Vlogs" folder in the A&D Youtube Shared Drive, one folder per
// vlog ("2026-09-17 - E36 M3 Ownership"). Anthony uploads straight from his
// phone through the Garage. Until 2026-09-19 these went to a separate "Vlog"
// drive, which duplicated this folder and has been retired.
// ---------------------------------------------------------------------------

/** Not secret: a Shared Drive ID only works for accounts that are members. */
const VLOG_DRIVE_ID = process.env.GOOGLE_DRIVE_YOUTUBE_DRIVE_ID || "0ANTZLlDuCiNxUk9PVA";
const VLOG_PARENT_ID = process.env.GOOGLE_DRIVE_VLOG_FOLDER_ID || "1jFxItVQKITNnYP3TZ8VSlVo2gZzu8Ju2";

/** The folder for one vlog, made if it doesn't exist yet (same name = same folder,
 *  so a second try on the same day doesn't scatter the files). */
export async function ensureVlogFolder(name: string): Promise<string> {
  const safe = safeFolderName(name) || "Vlog";
  const existing = await listChildren(VLOG_PARENT_ID, `mimeType = '${FOLDER_MIME}'`, VLOG_DRIVE_ID);
  const match = existing.find((f) => sameName(f.name, safe));
  return match ? match.id : createFolder(safe, VLOG_PARENT_ID);
}
