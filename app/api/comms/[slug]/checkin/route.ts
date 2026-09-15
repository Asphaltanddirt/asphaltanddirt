import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, isCommsOpen, isStaffCode, setCheckedIn, getAttendeeRoster, renameAttendee } from "@/lib/eventComms";

const MAX_SCREEN_NAME = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: { staffCode?: string; attendeeId?: string; attendeeIds?: string[]; checkedIn?: boolean; screenName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isStaffCode(settings, body.staffCode)) {
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
  if (screenName) {
    await renameAttendee(slug, ids[0], screenName);
  } else {
    for (const id of ids) await setCheckedIn(slug, id, Boolean(body.checkedIn));
  }

  const roster = await getAttendeeRoster(slug);
  return NextResponse.json({ status: "ok", roster });
}
