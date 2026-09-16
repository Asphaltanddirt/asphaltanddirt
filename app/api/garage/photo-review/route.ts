import { NextRequest, NextResponse } from "next/server";
import { canRunEvents, getSession } from "@/lib/garageAuth";
import { getSubmission, reviewSubmission } from "@/lib/eventMedia";

/** Owners and staff approve or reject a photo before it reaches the public gallery. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canRunEvents(session)) return NextResponse.json({ error: "Staff only." }, { status: 403 });

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

  try {
    await reviewSubmission(submission.id, body.decision, session.name || session.email);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("photo review failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
