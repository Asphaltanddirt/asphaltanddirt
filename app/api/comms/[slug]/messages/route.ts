import { NextRequest, NextResponse } from "next/server";
import {
  getCommsSettings,
  getMessages,
  postMessage,
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
  const messages = await getMessages(slug);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: { text?: string; sosType?: string; staffCode?: string; token?: string; announcementFromStaff?: boolean };
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

  if (staff) {
    authorName = "Staff";
    vehicleCallsign = "";
    channel = body.announcementFromStaff ? "Announcements" : "Chat";
  } else {
    const attendee = await getAttendeeByToken(slug, body.token || "");
    if (!attendee) {
      return NextResponse.json({ error: "We couldn't verify your link — try opening it again from your email." }, { status: 403 });
    }
    authorName = attendee.screenName;
    vehicleCallsign = attendee.vehicleCallsign;
    // SOS always reaches the group regardless of check-in status; a normal
    // message only reaches the group once staff has checked them in at
    // roll call — until then it goes to the staff-only line.
    channel = sosType ? "Chat" : attendee.checkedIn ? "Chat" : "Staff";
  }

  const { id } = await postMessage({
    eventSlug: slug,
    authorName,
    vehicleCallsign,
    channel,
    sosType,
    body: text,
    isStaff: staff,
  });

  return NextResponse.json({ status: "sent", id });
}
