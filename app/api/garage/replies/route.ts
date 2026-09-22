import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { setReplyStatus } from "@/lib/replyQueue";

/** Reply queue actions (Garage → Replies). Owners only. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  let body: { id?: string; action?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const url = (body.url || "").trim();
  if (url && !/^https:\/\/(x|twitter)\.com\//i.test(url)) return NextResponse.json({ error: "That doesn't look like an X link." }, { status: 400 });
  const status = body.action === "replied" ? "Replied" : body.action === "skip" ? "Skipped" : body.action === "undo" ? "New" : null;
  if (!status) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    await setReplyStatus(String(body.id || ""), status, session.name || session.email, url || undefined);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("reply queue action failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
