import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, isCommsOpen, isStaffCode, setCheckedIn, getAttendeeRoster, renameAttendee } from "@/lib/eventComms";

const MAX_SCREEN_NAME = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: { staffCode?: string; attendeeId?: string; checkedIn?: boolean; screenName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isStaffCode(settings, body.staffCode)) {
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  }
  if (!body.attendeeId) {
    return NextResponse.json({ error: "attendeeId is required." }, { status: 400 });
  }

  // A rename and a check-in toggle come through the same staff-gated route;
  // `screenName` present means "fix this person's name", nothing else.
  const screenName = (body.screenName || "").trim().slice(0, MAX_SCREEN_NAME);
  if (screenName) {
    await renameAttendee(body.attendeeId, screenName);
  } else {
    await setCheckedIn(body.attendeeId, Boolean(body.checkedIn));
  }

  const roster = await getAttendeeRoster(slug);
  return NextResponse.json({ status: "ok", roster });
}
