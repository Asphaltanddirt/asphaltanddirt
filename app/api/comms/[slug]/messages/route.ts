import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, getMessages, postMessage, isCommsOpen, isStaffCode, type Channel, type SosType } from "@/lib/eventComms";

const MAX_BODY_LENGTH = 500;
const MAX_NAME_LENGTH = 60;
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

  let body: {
    authorName?: string;
    vehicleCallsign?: string;
    channel?: string;
    sosType?: string;
    text?: string;
    staffCode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const authorName = (body.authorName || "").trim().slice(0, MAX_NAME_LENGTH);
  const vehicleCallsign = (body.vehicleCallsign || "").trim().slice(0, MAX_NAME_LENGTH);
  const text = (body.text || "").trim().slice(0, MAX_BODY_LENGTH);
  const sosType = SOS_TYPES.includes(body.sosType as SosType) ? (body.sosType as SosType) : undefined;
  const staff = isStaffCode(settings, body.staffCode);
  const channel: Channel = body.channel === "Announcements" ? "Announcements" : "Chat";

  if (!authorName || !text) {
    return NextResponse.json({ error: "Name and a message are required." }, { status: 400 });
  }
  // Only staff can post to Announcements — everyone can post to Chat and use SOS.
  if (channel === "Announcements" && !staff) {
    return NextResponse.json({ error: "Only staff can post announcements." }, { status: 403 });
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
