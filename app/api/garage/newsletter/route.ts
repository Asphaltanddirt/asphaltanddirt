import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { startIssue } from "@/lib/garageNewsletter";
import { NoDraftIssueError, sendDraftDigest } from "@/lib/weeklyDigestSend";

export const maxDuration = 60;

/** Owners run the weekly Dirt Line from the Garage:
 *   { action: "start" }   make this week's Draft issue (or open the existing one)
 *   { action: "test" }    send the newest Draft to the test inbox
 *   { action: "live" }    send it to every Newsletter subscriber and archive it */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "start") return NextResponse.json({ status: "ok", id: await startIssue() });
    if (body.action === "test" || body.action === "live") {
      const result = await sendDraftDigest(body.action);
      if (result.skipped) return NextResponse.json({ error: `Not sent: ${result.skipped}.` }, { status: 409 });
      return NextResponse.json({ status: "ok", ...result });
    }
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  } catch (err) {
    if (err instanceof NoDraftIssueError) return NextResponse.json({ error: err.message }, { status: 404 });
    console.error("garage newsletter action failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "That didn't work. Try again." }, { status: 502 });
  }
}
