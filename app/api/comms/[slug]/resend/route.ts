import { NextRequest, NextResponse } from "next/server";
import { findAttendeeByEmail, getCommsSettings, isCommsOpen } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import { buildPersonalCommsLink } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

/**
 * "Already signed up? Email me my link." For someone who closed the tab or
 * can't find the email at the trailhead, so they don't sign the whole waiver
 * again. The link only ever goes to the address on file, and the answer is the
 * same whether or not that address is registered, so nobody can use this to
 * check who's coming.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!settings || !isCommsOpen(settings)) {
    return NextResponse.json({ error: "Sign-up isn't open for this event." }, { status: 404 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = (body.email || "").trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter the email you signed up with." }, { status: 400 });
  }

  try {
    const [attendee, event] = await Promise.all([findAttendeeByEmail(slug, email), getEventBySlug(slug)]);
    if (attendee && event) {
      const built = buildPersonalCommsLink({
        recipientName: attendee.screenName,
        event,
        commsUrl: `${SITE_URL}/comms/${slug}?token=${attendee.accessToken}`,
      });
      await sendEmail({ to: attendee.email, subject: built.subject, html: built.html });
    }
  } catch (err) {
    console.error("comms link resend failed", err);
  }
  return NextResponse.json({ status: "ok" });
}
