import { NextRequest, NextResponse } from "next/server";
import { getSession, canSeeOwnerOnly } from "@/lib/garageAuth";
import { getEventBySlug } from "@/lib/events";
import { buildEventNotice, postEventNotice, noticeAlreadySent } from "@/lib/eventNotice";
import type { EventUpdateKind } from "@/lib/eventEmails";

/**
 * The social notice for a cancelled or postponed event.
 *
 * GET  ?slug=&kind=&why=&newDate=  → the text, to preview before sending.
 * POST                             → creates the cards and sends them now.
 *
 * Owner only. Calling off a ride in public is not a delegated job.
 */
function parse(v: unknown): EventUpdateKind {
  return v === "cancelled" || v === "postponed" ? v : "cancelled";
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  const q = req.nextUrl.searchParams;
  const slug = (q.get("slug") || "").trim();
  const event = slug ? await getEventBySlug(slug, { includeCrewOnly: true }).catch(() => null) : null;
  if (!event) return NextResponse.json({ error: "Couldn't find that event." }, { status: 404 });

  const newDate = /^\d{4}-\d{2}-\d{2}$/.test(q.get("newDate") || "") ? q.get("newDate")! : undefined;
  return NextResponse.json({
    status: "ok",
    text: buildEventNotice({ event, kind: parse(q.get("kind")), why: q.get("why") || "", newDate }),
    alreadySent: await noticeAlreadySent(slug),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { slug?: string; kind?: string; why?: string; newDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = (body.slug || "").trim();
  const why = (body.why || "").trim();
  if (!slug || !why) return NextResponse.json({ error: "Say why." }, { status: 400 });

  const event = await getEventBySlug(slug, { includeCrewOnly: true }).catch(() => null);
  if (!event) return NextResponse.json({ error: "Couldn't find that event." }, { status: 404 });

  try {
    const result = await postEventNotice({
      event,
      kind: parse(body.kind),
      why,
      newDate: /^\d{4}-\d{2}-\d{2}$/.test(body.newDate || "") ? body.newDate : undefined,
      by: session.name || session.email,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("event notice failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't post the notice." }, { status: 500 });
  }
}
