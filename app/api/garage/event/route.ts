import { NextRequest, NextResponse, after } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import {
  cleanEventEdit,
  createEvent,
  ensureDriveFolderNow,
  getEditableEvent,
  listVenues,
  updateEvent,
} from "@/lib/garageEventEditor";

/** Owners add ({ ...fields }) or edit ({ id, ...fields }) an event from the
 *  Garage. The Drive folders are made right after saving when the event is
 *  live (the hourly cron is the backstop). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const venues = await listVenues();
    const edit = cleanEventEdit(body, new Set(venues.map((v) => v.id)));
    if (typeof edit === "string") return NextResponse.json({ error: edit }, { status: 400 });

    let event;
    if (typeof body.id === "string" && body.id) {
      const existing = await getEditableEvent(body.id);
      if (!existing) return NextResponse.json({ error: "Event not found." }, { status: 404 });
      event = await updateEvent(existing.id, edit, existing.slug);
    } else {
      event = await createEvent(edit);
    }
    after(() => ensureDriveFolderNow(event));
    return NextResponse.json({ status: "ok", event });
  } catch (err) {
    console.error("garage event save failed", err);
    return NextResponse.json({ error: "Couldn't save the event. Try again." }, { status: 502 });
  }
}
