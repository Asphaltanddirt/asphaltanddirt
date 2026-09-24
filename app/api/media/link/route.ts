import { NextRequest, NextResponse } from "next/server";
import { fetchDriveMedia, getDriveFileInfo } from "@/lib/googleDrive";
import { DOWNLOAD_LIMIT_BYTES } from "@/lib/mediaKinds";
import { verifyMediaLink } from "@/lib/mediaLink";
import { findMediaByFileId } from "@/lib/mediaLibrary";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Serves one Media Library file to whoever holds a valid signed link — in
 * practice Airtable, fetching a clip onto a posting card. See lib/mediaLink.ts.
 * No session: the signature and the 15-minute expiry are the credential.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const fileId = q.get("id") || "";
  if (!verifyMediaLink(fileId, q.get("exp") || "", q.get("sig") || "")) {
    return NextResponse.json({ error: "This link has expired." }, { status: 403 });
  }
  const row = await findMediaByFileId(fileId).catch(() => null);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const info = await getDriveFileInfo(row.fileId);
  if (!info) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (info.size > DOWNLOAD_LIMIT_BYTES) return NextResponse.json({ error: "Too large." }, { status: 413 });

  const upstream = await fetchDriveMedia(row.fileId, req.headers.get("range")).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Couldn't load that file." }, { status: 502 });
  }
  const headers = new Headers({ "Accept-Ranges": "bytes", "Cache-Control": "private, no-store" });
  for (const name of ["content-type", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const name = (info.name || row.fileName || "clip.mp4").replace(/[^\x20-\x7e]/g, "_").replace(/[\r\n"\\]/g, "");
  headers.set("Content-Disposition", `inline; filename="${name}"`);
  return new Response(upstream.body, { status: upstream.status, headers });
}
