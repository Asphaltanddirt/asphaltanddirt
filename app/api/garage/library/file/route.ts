import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { fetchDriveMedia, getDriveFileInfo } from "@/lib/googleDrive";
import { DOWNLOAD_LIMIT_BYTES } from "@/lib/mediaKinds";
import { driveFileUrl, findMediaByFileId } from "@/lib/mediaLibrary";

// Vercel stops a function after this, mid-stream or not. That is why anything
// over DOWNLOAD_LIMIT_BYTES is sent to Drive instead (see lib/mediaKinds.ts).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Largest piece the preview player gets per request (see GET). */
const PREVIEW_CHUNK = 8 * 1024 * 1024;

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
  const inline = req.nextUrl.searchParams.get("inline") === "1";
  if (info.size > DOWNLOAD_LIMIT_BYTES && !inline) return NextResponse.redirect(driveFileUrl(row.fileId), 303);

  // The preview player (?inline=1, Jose 9/29: big videos "push to drive") gets
  // at most PREVIEW_CHUNK per request, whatever it asked for. A 206 shorter than
  // the requested range is allowed, and players just ask for the next piece, so
  // no single response runs near maxDuration and a 900 MB 4K video still plays
  // and seeks. Downloads keep the whole-file path (and the Drive redirect).
  let range = req.headers.get("range");
  if (inline && info.size > 0) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range || "bytes=0-");
    let start = m && m[1] ? Number(m[1]) : 0;
    let end = m && m[2] ? Number(m[2]) : info.size - 1;
    if (m && !m[1] && m[2]) {
      start = Math.max(0, info.size - Number(m[2]));
      end = info.size - 1;
    }
    end = Math.min(end, start + PREVIEW_CHUNK - 1, info.size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    range = `bytes=${start}-${end}`;
  }

  let upstream: Response;
  try {
    upstream = await fetchDriveMedia(row.fileId, range);
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
  // ?inline=1 plays it in the page (the Library's preview player, 9/29);
  // otherwise it's a download.
  const disposition = req.nextUrl.searchParams.get("inline") === "1" ? "inline" : "attachment";
  headers.set("Content-Disposition", `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  return new Response(upstream.body, { status: upstream.status, headers });
}
