import { NextRequest, NextResponse } from "next/server";
import { getSession, canSeeOwnerOnly } from "@/lib/garageAuth";
import { getEventBySlug, listRsvpsForEvent } from "@/lib/events";
import { buildRsvpUpdate } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";

/**
 * Tell everyone who RSVP'd that something changed — cancelled, postponed,
 * meetup moved, bring tire chains.
 *
 * The same job as /admin/event-update, moved to where it gets used. That page
 * asks for the ADMIN_API_SECRET in a password box, which is fine at a desk and
 * useless on a phone, outdoors, in weather — which is exactly when a ride gets
 * called off. Here the Garage session is the credential.
 *
 * Owner only: Jose or Anthony. Nobody else calls off a ride.
 *
 * `mode: "test"` sends one copy to the sender and nothing else. It is the
 * default, because the live send has no undo.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { slug?: string; message?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = (body.slug || "").trim();
  const message = (body.message || "").trim();
  if (!slug || !message) return NextResponse.json({ error: "Say what changed." }, { status: 400 });

  // Cancelled events stop resolving, and this is exactly when it's needed, so
  // ask for it by every status the editor can set.
  const event = await getEventBySlug(slug, { includeCrewOnly: true }).catch(() => null);
  if (!event) return NextResponse.json({ error: "Couldn't find that event." }, { status: 404 });

  const live = body.mode === "live";
  const recipients = live ? await listRsvpsForEvent(event.id) : [{ name: session.name || "You", email: session.email }];

  let sent = 0;
  const failed: string[] = [];
  for (const r of recipients) {
    try {
      const built = buildRsvpUpdate({ recipientName: r.name, event, message });
      await sendEmail({ to: r.email, subject: live ? built.subject : `[Test] ${built.subject}`, html: built.html });
      sent++;
    } catch (err) {
      console.error("event update send failed for", r.email, err);
      failed.push(r.email);
    }
  }

  return NextResponse.json({ status: "ok", mode: live ? "live" : "test", sent, failed: failed.length, total: recipients.length });
}
