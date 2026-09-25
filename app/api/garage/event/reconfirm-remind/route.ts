import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { getEventBySlug } from "@/lib/events";
import { buildRsvpUpdate } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { pendingReconfirms, reconfirmLink } from "@/lib/rsvpReconfirm";

export const maxDuration = 60;

/**
 * Garage → event → "Remind the ones who haven't answered" (punchlist 19,
 * 2026-09-25). After a postponement everybody gets a confirm link; this sends
 * it again, only to people who still owe an answer about the current date.
 * Owners only. The same email as the postponement, so the link and wording
 * match what they already have.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  const event = slug ? await getEventBySlug(slug).catch(() => null) : null;
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (!event.postponedOn) return NextResponse.json({ error: "This event hasn't been postponed, so nobody owes an answer." }, { status: 400 });

  const pending = await pendingReconfirms(event.id, event.date, event.postponedOn);
  let sent = 0;
  let failed = 0;
  for (const r of pending) {
    try {
      const built = buildRsvpUpdate({
        recipientName: r.name,
        event,
        message: "A quick reminder: we still need to hear whether the new date works for you. One tap below, and your waiver stays on file either way.",
        kind: "postponed",
        newDate: event.date,
        confirmUrl: reconfirmLink(event.slug, r.id, event.date),
      });
      await sendEmail({ to: r.email, subject: `Reminder: ${built.subject}`, html: built.html });
      sent++;
    } catch {
      failed++;
    }
  }
  return NextResponse.json({ status: "ok", sent, failed });
}
