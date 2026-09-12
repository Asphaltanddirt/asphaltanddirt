import { NextRequest, NextResponse } from "next/server";
import {
  getCommsSettings,
  getVisibleMessages,
  postMessage,
  type MessageViewer,
  isCommsOpen,
  isSosOpen,
  isStaffCode,
  getAttendeeByToken,
  type Channel,
  type SosType,
} from "@/lib/eventComms";

const MAX_BODY_LENGTH = 500;
const SOS_TYPES: SosType[] = ["Mechanical", "Stuck", "Lost", "Emergency"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings)) {
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

  const messages = await getVisibleMessages(slug, viewer);
  return NextResponse.json({ messages, ...(checkedIn === undefined ? {} : { checkedIn }) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: {
    text?: string;
    sosType?: string;
    staffCode?: string;
    token?: string;
    announcementFromStaff?: boolean;
    replyToAttendeeId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (body.text || "").trim().slice(0, MAX_BODY_LENGTH);
  const sosType = SOS_TYPES.includes(body.sosType as SosType) ? (body.sosType as SosType) : undefined;
  const staff = isStaffCode(settings, body.staffCode);

  if (sosType && !isSosOpen(settings)) {
    return NextResponse.json({ error: "SOS is no longer active for this event." }, { status: 403 });
  }
  if (!text) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  let authorName: string;
  let vehicleCallsign: string;
  let channel: Channel;
  let attendeeId: string | undefined;
  let replyToAttendeeId: string | undefined;

  if (staff) {
    authorName = "Staff";
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
    // SOS always reaches the group regardless of check-in status; a normal
    // message only reaches the group once staff has checked them in at
    // roll call — until then it goes to the staff-only line.
    channel = sosType ? "Chat" : attendee.checkedIn ? "Chat" : "Staff";
  }

  const { id } = await postMessage({
    eventSlug: slug,
    attendeeId,
    replyToAttendeeId,
    authorName,
    vehicleCallsign,
    channel,
    sosType,
    body: text,
    isStaff: staff,
  });

  return NextResponse.json({ status: "sent", id });
}
