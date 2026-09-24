import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { allowedOrigin } from "@/lib/eventMedia";
import { getEventBySlug } from "@/lib/events";
import {
  createUploadSession,
  ensureOtherFootageFolder,
  ensureStaffFolder,
  ensureVlogFolder,
  folderUrl,
  isDriveConfigured,
} from "@/lib/googleDrive";

const MAX_FILES = 50;
const MAX_BYTES = 20 * 1024 ** 3;

export type UploadTarget = { type: "event"; slug: string } | { type: "vlog"; title: string } | { type: "other" };

function todayNY() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function isMedia(name: string, mimeType: string) {
  return (
    mimeType.startsWith("video/") ||
    mimeType.startsWith("image/") ||
    /\.(mov|mp4|m4v|heic|heif|jpe?g|png|insv|insp|dng)$/i.test(name)
  );
}

/**
 * Starts a Garage upload to Google Drive, the same way on a phone or a computer:
 *   event → that event's "1. Staff Uploads / <your name>" (any signed-in crew)
 *   vlog  → the Vlog Shared Drive, "<today> - <title>" (Owners)
 *   other → "Other Footage / <your name>" in the events drive (any signed-in
 *           crew: a clip from the gas station is anybody's to share)
 * Returns one resumable upload URL per file. The browser sends the bytes
 * straight to Google in pieces, so big phone videos never pass through us.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isDriveConfigured()) return NextResponse.json({ error: "Drive isn't connected." }, { status: 503 });

  const origin = allowedOrigin(req.headers.get("origin"));
  if (!origin) return NextResponse.json({ error: "Uploads must come from asphaltanddirt.com." }, { status: 403 });

  let body: { target?: UploadTarget; files?: { name?: string; size?: number; mimeType?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const files = (body.files || []).map((f) => ({
    name: (f.name || "file").replace(/[\\/]/g, " ").trim().slice(0, 150),
    size: Number(f.size),
    mimeType: (f.mimeType || "").trim() || "application/octet-stream",
  }));
  if (files.length === 0 || files.length > MAX_FILES) {
    return NextResponse.json({ error: `Pick between 1 and ${MAX_FILES} files.` }, { status: 400 });
  }
  for (const f of files) {
    if (!Number.isFinite(f.size) || f.size <= 0) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `"${f.name}" is over 20 GB.` }, { status: 400 });
    if (!isMedia(f.name, f.mimeType)) {
      return NextResponse.json({ error: `"${f.name}" isn't a photo or video.` }, { status: 400 });
    }
  }

  try {
    let folderId: string;
    let prefix = "";
    const target = body.target;
    if (target?.type === "vlog") {
      if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Vlogs are for Owners." }, { status: 403 });
      const title = (target.title || "").trim().slice(0, 100) || "Vlog";
      folderId = await ensureVlogFolder(`${todayNY()} - ${title}`);
      prefix = `${title} - `;
    } else if (target?.type === "event" && target.slug) {
      const event = await getEventBySlug(target.slug, { includeCrewOnly: true });
      if (!event) return NextResponse.json({ error: "That event wasn't found." }, { status: 404 });
      folderId = await ensureStaffFolder(event, session.name || session.email.split("@")[0]);
    } else if (target?.type === "other") {
      folderId = await ensureOtherFootageFolder(session.name || session.email.split("@")[0]);
    } else {
      return NextResponse.json({ error: "Pick where this goes." }, { status: 400 });
    }

    const uploads = [];
    for (const f of files) {
      const fileName = `${prefix}${f.name}`;
      uploads.push({
        fileName,
        uploadUrl: await createUploadSession({ folderId, name: fileName, mimeType: f.mimeType, size: f.size, origin }),
      });
    }
    return NextResponse.json({ folderId, folderUrl: folderUrl(folderId), uploads });
  } catch (err) {
    console.error("garage upload start failed", err);
    return NextResponse.json({ error: "Couldn't start the upload. Try again." }, { status: 502 });
  }
}
