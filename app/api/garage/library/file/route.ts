import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { fetchDriveMedia, getDriveFileInfo } from "@/lib/googleDrive";
import { DOWNLOAD_LIMIT_BYTES } from "@/lib/mediaKinds";
import { driveFileUrl, findMediaByFileId } from "@/lib/mediaLibrary";

// Vercel stops a function after this, mid-stream or not. That is why anything
// over DOWNLOAD_LIMIT_BYTES is sent to Drive instead (see lib/mediaKinds.ts).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Garage → Library → Download. Streams one library file from the private
 * Shared Drive to a signed-in Garage user, as an attachment so the phone saves
 * it instead of trying to play it. Range passes through, so an interrupted
 * download can resume.
 *
 * The size is checked here as well as on the card, because older rows have no
 * Size and a card can't know: a file over the limit is redirected to its page
 * in Drive rather than started and cut off at 60 seconds.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get("id") || "";
  // Only files the library lists — the Drive token can read far more than that.
  const row = await findMediaByFileId(fileId).catch(() => null);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const info = await getDriveFileInfo(row.fileId);
  if (!info) return NextResponse.json({ error: "That file isn't in Drive any more." }, { status: 404 });
  if (info.size > DOWNLOAD_LIMIT_BYTES) return NextResponse.redirect(driveFileUrl(row.fileId), 303);

  let upstream: Response;
  try {
    upstream = await fetchDriveMedia(row.fileId, req.headers.get("range"));
  } catch (err) {
    console.error("library download failed", err);
    return NextResponse.json({ error: "Couldn't load that file." }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Couldn't load that file." }, { status: upstream.status === 416 ? 416 : 502 });
  }

  const headers = new Headers({ "Accept-Ranges": "bytes", "Cache-Control": "private, no-store" });
  for (const name of ["content-type", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Drive's own name, with a plain-ASCII fallback for old browsers and the
  // UTF-8 form for everything else (emoji and accents survive on a phone).
  const name = (info.name || row.fileName || "download").replace(/[\r\n"\\]/g, "");
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");
  headers.set("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  return new Response(upstream.body, { status: upstream.status, headers });
}
