import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, isCommsOpen, submitWaiver } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import { buildPersonalCommsLink } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

const MAX_LENGTH = 80;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings)) {
    return NextResponse.json({ error: "Registration isn't open for this event." }, { status: 404 });
  }

  let body: { screenName?: string; vehicleCallsign?: string; legalName?: string; email?: string; agreed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const screenName = (body.screenName || "").trim().slice(0, MAX_LENGTH);
  const vehicleCallsign = (body.vehicleCallsign || "").trim().slice(0, MAX_LENGTH);
  const legalName = (body.legalName || "").trim().slice(0, MAX_LENGTH);
  const email = (body.email || "").trim().slice(0, MAX_LENGTH);

  if (!screenName || !vehicleCallsign || !legalName || !email) {
    return NextResponse.json({ error: "Please fill out every field." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!body.agreed) {
    return NextResponse.json({ error: "You must agree to the waiver to continue." }, { status: 400 });
  }

  const attendee = await submitWaiver({ eventSlug: slug, screenName, vehicleCallsign, legalName, email });

  const event = await getEventBySlug(slug);
  if (event) {
    const commsUrl = `${SITE_URL}/comms/${slug}?token=${attendee.accessToken}`;
    try {
      const built = buildPersonalCommsLink({ recipientName: screenName, event, commsUrl });
      await sendEmail({ to: email, subject: built.subject, html: built.html });
    } catch (err) {
      console.error("Personal comms link send failed for", email, err);
      // The Attendee row (the waiver record) is already saved either way —
      // don't fail the request over a flaky email send.
    }
  }

  return NextResponse.json({ status: "ok" });
}
