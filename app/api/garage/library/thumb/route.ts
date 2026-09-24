import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { fetchDriveThumbnail } from "@/lib/googleDrive";
import { findMediaByFileId } from "@/lib/mediaLibrary";

export const dynamic = "force-dynamic";

/**
 * A Library card's thumbnail, served from our own origin. Drive's thumbnail
 * links only work with our token attached, so going through here is what lets
 * the Shared Drive stay private. Only files the library lists are served: the
 * token can see all of team@'s Drive, and an id in a URL is not proof of
 * anything. A 404 tells the card to show its plain placeholder instead.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get("id") || "";
  const row = await findMediaByFileId(fileId).catch(() => null);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const upstream = await fetchDriveThumbnail(row.fileId).catch(() => null);
  if (!upstream?.body) return NextResponse.json({ error: "No thumbnail." }, { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      // A thumbnail doesn't change, and scrolling back up the grid on a phone
      // shouldn't fetch it twice. Private: it's behind the Garage sign-in.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
