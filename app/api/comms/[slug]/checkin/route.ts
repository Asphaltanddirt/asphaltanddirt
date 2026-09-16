import { NextRequest, NextResponse } from "next/server";
import {
  getCommsSettings,
  isCommsOpen,
  staffViewer,
  setCheckedIn,
  getAttendeeRoster,
  renameAttendee,
  resetAttendeeLink,
} from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import { buildPersonalCommsLink } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

const MAX_SCREEN_NAME = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: { staffCode?: string; attendeeId?: string; attendeeIds?: string[]; checkedIn?: boolean; screenName?: string; resetLink?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { isStaff } = await staffViewer(settings, body.staffCode);
  if (!isStaff) {
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  }
  // One person, or a whole rig at once (everyone who signed up under the
  // same vehicle, checked in with one tap at Staging).
  const ids = (Array.isArray(body.attendeeIds) ? body.attendeeIds : body.attendeeId ? [body.attendeeId] : [])
    .filter((id): id is string => typeof id === "string" && /^rec[A-Za-z0-9]{14}$/.test(id))
    .slice(0, 12);
  if (ids.length === 0) {
    return NextResponse.json({ error: "attendeeId is required." }, { status: 400 });
  }

  // A rename and a check-in toggle come through the same staff-gated route;
  // `screenName` present means "fix this person's name", nothing else.
  const screenName = (body.screenName || "").trim().slice(0, MAX_SCREEN_NAME);
  if (body.resetLink) {
    // Lost or forwarded link: new token (the old link stops working) and the
    // new link goes only to the email on file, never back to the staff phone.
    const [attendee, event] = await Promise.all([resetAttendeeLink(slug, ids[0]), getEventBySlug(slug)]);
    if (!attendee) {
      return NextResponse.json({ error: "Couldn't find that person." }, { status: 404 });
    }
    let emailed = false;
    if (attendee.email && event) {
      try {
        const built = buildPersonalCommsLink({
          recipientName: attendee.screenName,
          event,
          commsUrl: `${SITE_URL}/comms/${slug}?token=${attendee.accessToken}`,
        });
        await sendEmail({ to: attendee.email, subject: built.subject, html: built.html });
        emailed = true;
      } catch (err) {
        console.error("comms link reset email failed", err);
      }
    }
    const roster = await getAttendeeRoster(slug);
    return NextResponse.json({ status: "ok", emailed, roster });
  } else if (screenName) {
    await renameAttendee(slug, ids[0], screenName);
  } else {
    for (const id of ids) await setCheckedIn(slug, id, Boolean(body.checkedIn));
  }

  const roster = await getAttendeeRoster(slug);
  return NextResponse.json({ status: "ok", roster });
}
