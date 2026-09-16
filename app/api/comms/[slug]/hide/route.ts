import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, getVisibleMessage, isCommsOpen, staffViewer, updateMessage } from "@/lib/eventComms";
import { updateSubmission } from "@/lib/eventMedia";

/** Staff: hide a post from attendees right away (a photo also leaves the
 *  public gallery and is marked rejected), or put it back. Unhiding never
 *  publishes: the photo goes back to waiting for approval. Nothing is deleted. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) return NextResponse.json({ error: "This chat isn't open." }, { status: 404 });

  let body: { staffCode?: string; messageId?: string; hidden?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { isStaff } = await staffViewer(settings, body.staffCode);
  if (!isStaff) return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const message = await getVisibleMessage(slug, { kind: "staff" }, body.messageId || "");
  if (!message) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const hidden = body.hidden === true;
  try {
    await updateMessage(slug, message.id, { Hidden: hidden });
    if (message.mediaKind === "Photo" && message.mediaSubmissionId && message.channel === "Chat") {
      await updateSubmission(
        message.mediaSubmissionId,
        hidden ? { Approved: false, Rejected: true } : { Rejected: false },
      );
    }
    return NextResponse.json({ hidden });
  } catch (err) {
    console.error("tailgate hide failed", err);
    return NextResponse.json({ error: "Couldn't update that post." }, { status: 502 });
  }
}
