import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canSeeControlRoom } from "@/lib/garageControl";
import { getCommsSettings, setTailgateOpen } from "@/lib/eventComms";
import { setAutoPostSwitch } from "@/lib/autoPost";

/** The Control Room's switches. Owner-only, and each one maps to exactly one
 *  Airtable field — nothing here does anything you couldn't undo by tapping
 *  the same switch back. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeControlRoom(session)) return NextResponse.json({ error: "Not for your account." }, { status: 403 });

  let body: { action?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action === "autopost-on" || body.action === "autopost-off") {
    try {
      await setAutoPostSwitch(body.action === "autopost-on", session.name || session.email);
      return NextResponse.json({ status: "ok" });
    } catch (err) {
      console.error("auto-post switch failed", err);
      return NextResponse.json({ error: "That didn't go through. Try again." }, { status: 502 });
    }
  }

  const slug = (body.slug || "").trim();
  if (!slug || (body.action !== "tailgate-open" && body.action !== "tailgate-close")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const settings = await getCommsSettings(slug);
    if (!settings) return NextResponse.json({ error: "No Tailgate set up for that event." }, { status: 404 });
    await setTailgateOpen(settings, body.action === "tailgate-open");
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("garage control action failed", err);
    return NextResponse.json({ error: "That didn't go through. Try again." }, { status: 502 });
  }
}
