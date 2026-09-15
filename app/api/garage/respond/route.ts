import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { setEventResponse, type EventResponse } from "@/lib/garageEvents";

const ALLOWED: EventResponse[] = ["Going", "Maybe", "Can't"];

/** Crew answering an event: Going / Maybe / Can't. Signed-in Garage only, and
 *  always recorded against the signed-in person — never an email from the
 *  request body. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { eventSlug?: string; response?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const eventSlug = (body.eventSlug || "").trim();
  const response = body.response as EventResponse;
  if (!eventSlug || !ALLOWED.includes(response)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await setEventResponse({ email: session.email, name: session.name, eventSlug, response });
    return NextResponse.json({ status: "ok", response });
  } catch (err) {
    console.error("garage event response failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
