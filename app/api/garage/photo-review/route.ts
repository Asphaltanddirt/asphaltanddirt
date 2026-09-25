import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canRunEvent } from "@/lib/eventAccess";
import { getCrewEvents } from "@/lib/events";
import { getSubmission, reviewSubmission } from "@/lib/eventMedia";

/** Owners, and crew who marked Going on the photo's event, approve or reject
 *  a photo before it reaches the public gallery. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { submissionId?: string; decision?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!/^rec[A-Za-z0-9]{14}$/.test(body.submissionId || "") || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const submission = await getSubmission(body.submissionId as string);
  if (!submission) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const eventId = ((submission.fields.Event as string[] | undefined) || [])[0];
  const { upcoming, past } = await getCrewEvents().catch(() => ({ upcoming: [], past: [] }));
  const slug = [...upcoming, ...past].find((e) => e.id === eventId)?.slug || "";
  if (!(await canRunEvent(session, slug))) return NextResponse.json({ error: "Only the crew going to this event can review its photos." }, { status: 403 });

  try {
    await reviewSubmission(submission.id, body.decision, session.name || session.email);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("photo review failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
