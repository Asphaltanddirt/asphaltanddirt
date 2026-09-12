import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, isCommsOpen, isStaffCode, setCheckedIn, getAttendeeRoster } from "@/lib/eventComms";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: { staffCode?: string; attendeeId?: string; checkedIn?: boolean };
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

  await setCheckedIn(body.attendeeId, Boolean(body.checkedIn));
  const roster = await getAttendeeRoster(slug);
  return NextResponse.json({ status: "ok", roster });
}
