import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, getVisibleMessage, isCommsOpen, likerKeyFor, resolveCommsCaller, setLike } from "@/lib/eventComms";

/** Heart / un-heart a photo in the Tailgate feed. Photos only. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });

  let body: { token?: string; staffCode?: string; staffName?: string; messageId?: string; liked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const caller = await resolveCommsCaller(settings, { token: body.token, staffCode: body.staffCode });
  if (!caller) return NextResponse.json({ error: "We couldn't verify your link." }, { status: 403 });

  const message = await getVisibleMessage(slug, caller.viewer, body.messageId || "");
  if (!message || message.mediaKind !== "Photo") return NextResponse.json({ error: "Not found." }, { status: 404 });

  const staffName = (body.staffName || "").trim().slice(0, 60) || "Staff";
  const key = likerKeyFor({ staff: caller.staff, attendeeId: caller.attendee?.id, staffName });
  const result = await setLike(slug, message.id, { key, name: caller.staff ? staffName : caller.attendee.screenName }, body.liked === true);
  return NextResponse.json(result);
}
