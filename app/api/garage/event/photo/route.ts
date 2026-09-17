import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getEditableEvent, replaceEventPhoto } from "@/lib/garageEventEditor";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

/** Owners replace an event's photo/flyer. The browser shrinks the image first,
 *  so it arrives as base64 well under Vercel's request limit. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { id?: string; filename?: string; contentType?: string; base64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That photo is too big. Try a smaller one." }, { status: 400 });
  }
  const contentType = body.contentType || "";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType) || !body.base64) {
    return NextResponse.json({ error: "Pick a JPG, PNG or WebP photo." }, { status: 400 });
  }
  if (Math.floor((body.base64.length * 3) / 4) > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too big. Try a smaller one." }, { status: 413 });
  }
  const event = await getEditableEvent(body.id || "");
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  try {
    const updated = await replaceEventPhoto(event.id, {
      filename: (body.filename || "event-photo.jpg").replace(/[^\w.-]+/g, "-").slice(0, 80),
      contentType,
      base64: body.base64,
    });
    return NextResponse.json({ status: "ok", photoUrl: updated.photoUrl });
  } catch (err) {
    console.error("garage event photo failed", err);
    return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 502 });
  }
}
