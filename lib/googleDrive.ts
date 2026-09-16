/**
 * Google Drive for event media: visitor photo/video submissions land in the
 * "A&D Trail Runs" Shared Drive, under
 *
 *   YYYY.MM.DD - Event Title / Attendee Submissions / <date time - Name> /
 *
 * matching the folder layout the team keeps by hand. If an event's folder (or
 * its Attendee Submissions subfolder) doesn't exist yet, it's created with the
 * standard three subfolders.
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

export const EVENT_SUBFOLDERS = ["A&D Team Uploads", "Attendee Submissions", "Best Photo & Videos"] as const;
const SUBMISSIONS_FOLDER = "Attendee Submissions";

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

async function listChildren(parentId: string, extraQuery = ""): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${escapeQuery(parentId)}' in parents and trashed = false${extraQuery ? ` and ${extraQuery}` : ""}`,
      corpora: "drive",
      driveId: driveId(),
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

/**
 * The event's "Attendee Submissions" folder, found by the event folder's date
 * prefix (so renaming the rest of the folder is fine). Missing pieces are
 * created: the event folder with all three standard subfolders, or just the
 * Attendee Submissions subfolder.
 */
export async function getAttendeeSubmissionsFolder(event: { date: string; title: string }): Promise<string> {
  const prefix = eventFolderPrefix(event.date);
  const topLevel = await listChildren(driveId(), `mimeType = '${FOLDER_MIME}' and name contains '${escapeQuery(prefix)}'`);
  const eventFolder = topLevel.find((f) => f.name.startsWith(prefix));

  if (!eventFolder) {
    const eventFolderId = await createFolder(`${prefix} - ${event.title}`, driveId());
    let submissionsId = "";
    for (const name of EVENT_SUBFOLDERS) {
      const id = await createFolder(name, eventFolderId);
      if (name === SUBMISSIONS_FOLDER) submissionsId = id;
    }
    return submissionsId;
  }

  const subfolders = await listChildren(eventFolder.id, `mimeType = '${FOLDER_MIME}'`);
  const existing = subfolders.find((f) => f.name.trim().toLowerCase() === SUBMISSIONS_FOLDER.toLowerCase());
  return existing ? existing.id : createFolder(SUBMISSIONS_FOLDER, eventFolder.id);
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
