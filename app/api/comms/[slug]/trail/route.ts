import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, isCommsOpen, staffViewer, updateTrail, trailStateFor } from "@/lib/eventComms";

const MAX_CHANNEL = 12;

/**
 * Staff trail controls: Roll out (set channels, chat goes dark for attendees),
 * Change channel, and Trail over (chat comes back, thank-you email 3 hours
 * later). Staff-code gated, like check-in.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });
  }

  let body: { staffCode?: string; action?: string; trailChannel?: string; staffChannel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { isStaff } = await staffViewer(settings, body.staffCode);
  if (!isStaff) {
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  }

  const action = body.action;
  if (action !== "rollout" && action !== "channel" && action !== "over") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const trailChannel = (body.trailChannel || "").trim().slice(0, MAX_CHANNEL);
  const staffChannel = (body.staffChannel || "").trim().slice(0, MAX_CHANNEL);
  if (action !== "over" && !trailChannel) {
    return NextResponse.json({ error: "Enter the trail channel." }, { status: 400 });
  }

  await updateTrail(settings, action, { trailChannel, staffChannel });

  const fresh = await getCommsSettings(slug);
  return NextResponse.json({ status: "ok", trail: fresh ? trailStateFor(fresh, true) : null });
}
