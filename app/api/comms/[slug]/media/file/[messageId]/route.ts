import { NextRequest, NextResponse } from "next/server";
import { fetchDriveMedia } from "@/lib/googleDrive";
import { getCommsSettings, getVisibleMessage, isCommsOpen, resolveCommsCaller } from "@/lib/eventComms";

// A <video> re-requests from where it stopped if a long stream gets cut off.
export const maxDuration = 60;

/**
 * The full-quality original of a Tailgate photo or video, streamed from the
 * private Shared Drive to someone allowed to see the post: plays videos in the
 * feed, and ?download=1 saves either kind. Range requests pass through so
 * videos can seek.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; messageId: string }> }) {
  const { slug, messageId } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });

  const search = req.nextUrl.searchParams;
  const caller = await resolveCommsCaller(settings, { token: search.get("token"), staffCode: search.get("staff") });
  if (!caller) return NextResponse.json({ error: "We couldn't verify your link." }, { status: 403 });
  if (!caller.staff && settings.trailStatus === "On trail") {
    return NextResponse.json({ error: "Media is paused while we're on the trail." }, { status: 403 });
  }

  const message = await getVisibleMessage(slug, caller.viewer, messageId);
  if (!message || !message.mediaKind || !message.driveFileId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetchDriveMedia(message.driveFileId, req.headers.get("range"));
  } catch (err) {
    console.error("tailgate media stream failed", err);
    return NextResponse.json({ error: "Couldn't load that file." }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Couldn't load that file." }, { status: upstream.status === 416 ? 416 : 502 });
  }

  const headers = new Headers({ "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" });
  for (const name of ["content-type", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (search.get("download") === "1") {
    const fileName = message.driveFileName.replace(/^\d+ /, "").replace(/["\\\r\n]/g, "") || "tailgate-media";
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
