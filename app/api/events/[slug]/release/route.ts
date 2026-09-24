import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { getRsvpForRelease, setReleased, verifyReleaseLink } from "@/lib/rsvpRelease";

/** Releases (or takes back) a spot. Authorised by the signed link, not a
 *  login, like the re-confirm route: these are attendees, not Garage users. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: { id?: string; date?: string; token?: string; released?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!verifyReleaseLink(body.id, body.date, body.token)) {
    return NextResponse.json({ error: "That link didn't work." }, { status: 403 });
  }

  try {
    // The link must belong to this event, on the date it was signed for. A
    // moved event makes old links stop working rather than act on the new day.
    const [event, rsvp] = await Promise.all([getEventBySlug(slug), getRsvpForRelease(body.id as string)]);
    if (!event || !rsvp || !rsvp.eventIds.includes(event.id) || event.date !== body.date) {
      return NextResponse.json({ error: "That link is for a different date or event." }, { status: 410 });
    }
    await setReleased(rsvp.id, body.released !== false);
    return NextResponse.json({ status: "ok", released: body.released !== false });
  } catch (err) {
    console.error("release spot failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
}
