import { NextRequest, NextResponse } from "next/server";
import {
  getCommsSettings,
  getVisibleMessages,
  postMessage,
  type MessageViewer,
  isCommsOpen,
  isStaffCode,
  getAttendeeByToken,
  trailStateFor,
  likerKeyFor,
  type Channel,
} from "@/lib/eventComms";

const MAX_BODY_LENGTH = 500;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }
  // Every caller must prove who they are. Without this the endpoint handed
  // the entire event's chat — including every private staff-line
  // conversation — to anyone who knew the slug.
  const token = req.nextUrl.searchParams.get("token") || "";
  const staff = isStaffCode(settings, req.nextUrl.searchParams.get("staff"));

  let viewer: MessageViewer;
  let checkedIn: boolean | undefined;

  if (staff) {
    viewer = { kind: "staff" };
  } else {
    const attendee = await getAttendeeByToken(slug, token);
    if (!attendee) {
      return NextResponse.json({ error: "We couldn't verify your link." }, { status: 403 });
    }
    viewer = { kind: "attendee", attendeeId: attendee.id, checkedIn: attendee.checkedIn };
    // Reporting roll-call status on the poll is what lets their view switch
    // to the group chat the moment staff checks them in, without a reload.
    checkedIn = attendee.checkedIn;
  }

  // Trail state rides along on every poll, so Roll out / a channel change /
  // Trail over reaches each phone the next time it has signal. The staff
  // channel is only included for staff.
  const trail = trailStateFor(settings, staff);

  // On the trail, attendees get the channel screen and nothing else — no
  // message list to scroll while driving.
  if (!staff && trail.status === "On trail") {
    return NextResponse.json({ messages: [], trail, checkedIn });
  }

  // Who's asking, so their own likes show as a filled heart. A staff phone
  // likes under the name it posts as (sent along with the poll).
  const likerKey = staff
    ? likerKeyFor({ staff: true, staffName: req.nextUrl.searchParams.get("name") || "" })
    : likerKeyFor({ staff: false, attendeeId: viewer.kind === "attendee" ? viewer.attendeeId : "" });
  const messages = await getVisibleMessages(slug, viewer, likerKey);
  return NextResponse.json({ messages, trail, ...(checkedIn === undefined ? {} : { checkedIn }) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: {
    text?: string;
    staffCode?: string;
    token?: string;
    announcementFromStaff?: boolean;
    replyToAttendeeId?: string;
    staffName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (body.text || "").trim().slice(0, MAX_BODY_LENGTH);
  const staff = isStaffCode(settings, body.staffCode);

  if (!text) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }
  // Chat is closed for attendees while the group is on the trail. Staff can
  // still post (e.g. an announcement people see when they get signal).
  if (!staff && settings.trailStatus === "On trail") {
    return NextResponse.json(
      { error: "Chat is paused while we're on the trail. Call staff on the trail channel or flag down a staff vehicle; in an emergency call 911." },
      { status: 403 },
    );
  }

  let authorName: string;
  let vehicleCallsign: string;
  let channel: Channel;
  let attendeeId: string | undefined;
  let replyToAttendeeId: string | undefined;

  if (staff) {
    // Whoever is on comms names themselves on their own device. Claimed, not
    // verified — but anyone holding the staff code is staff by definition, so
    // what's missing here is attribution, not authentication.
    authorName = (body.staffName || "").trim().slice(0, 60) || "Staff";
    vehicleCallsign = "";
    // A reply addressed to one person goes onto the Staff line tagged with
    // their record ID, so it reaches them and nobody else. Without the tag a
    // staff message is a normal group post.
    replyToAttendeeId = (body.replyToAttendeeId || "").trim() || undefined;
    channel = body.announcementFromStaff ? "Announcements" : replyToAttendeeId ? "Staff" : "Chat";
  } else {
    const attendee = await getAttendeeByToken(slug, body.token || "");
    if (!attendee) {
      return NextResponse.json({ error: "We couldn't verify your link — try opening it again from your email." }, { status: 403 });
    }
    attendeeId = attendee.id;
    authorName = attendee.screenName;
    vehicleCallsign = attendee.vehicleCallsign;
    // A normal message only reaches the group once staff has checked them in
    // at roll call — until then it goes to the staff-only line.
    channel = attendee.checkedIn ? "Chat" : "Staff";
  }

  const { id } = await postMessage({
    eventSlug: slug,
    attendeeId,
    replyToAttendeeId,
    authorName,
    vehicleCallsign,
    channel,
    body: text,
    isStaff: staff,
  });

  return NextResponse.json({ status: "sent", id });
}
