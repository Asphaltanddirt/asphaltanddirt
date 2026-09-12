import { NextRequest, NextResponse } from "next/server";
import { getCommsSettings, isCommsOpen, submitWaiver, type WaiverChild } from "@/lib/eventComms";
import { getEventBySlug } from "@/lib/events";
import { buildPersonalCommsLink } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { SITE_URL } from "@/lib/site";

const MAX_LENGTH = 120;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_LENGTH) : "";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getCommsSettings(slug);
  if (!isCommsOpen(settings) || !settings) {
    return NextResponse.json({ error: "Registration isn't open for this event." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const legalName = clean(body.legalName);
  const email = clean(body.email);
  const phone = clean(body.phone);
  const screenName = clean(body.screenName);
  const vehicleCallsign = clean(body.vehicleCallsign);
  const signature = clean(body.signature);

  if (!legalName || !email || !phone || !screenName || !vehicleCallsign) {
    return NextResponse.json({ error: "Please fill out every required field." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Please type your name as your signature." }, { status: 400 });
  }

  // Every acceptance box the shown document requires must be ticked — these
  // are the agreement itself, not UI niceties.
  const acceptedAdultTerms = body.acceptedAdultTerms === true;
  const acceptedElectronicSignature = body.acceptedElectronicSignature === true;
  const acceptedMediaScope = body.acceptedMediaScope === true;
  const acceptedParentalAuthority = body.acceptedParentalAuthority === true;
  const acknowledgedPrivacyNotice = body.acknowledgedPrivacyNotice === true;

  if (!acceptedAdultTerms || !acceptedElectronicSignature) {
    return NextResponse.json({ error: "You must accept the agreement to continue." }, { status: 400 });
  }
  if (!acknowledgedPrivacyNotice) {
    return NextResponse.json({ error: "Please acknowledge the privacy policy to continue." }, { status: 400 });
  }

  const rawChildren = Array.isArray(body.children) ? body.children : [];
  const children: WaiverChild[] = rawChildren
    .map((c) => {
      const child = (c || {}) as Record<string, unknown>;
      return {
        name: clean(child.name),
        age: clean(child.age),
        relationship: clean(child.relationship),
        mediaConsent: child.mediaConsent === true,
        attendanceDates: clean(child.attendanceDates),
      };
    })
    .filter((c) => c.name)
    .slice(0, 4);

  // Listing a child means asserting parental authority for them.
  if (children.length > 0 && !acceptedParentalAuthority) {
    return NextResponse.json(
      { error: "Please confirm you're the parent or legal guardian of the children listed." },
      { status: 400 },
    );
  }

  // Declining is allowed (not everyone has someone to list, and some would
  // rather not share it) — but a decline and a fill-in are mutually
  // exclusive, so the decline wins and the fields are stored empty.
  const emergencyContactDeclined = body.emergencyContactDeclined === true;

  const attendee = await submitWaiver({
    eventSlug: slug,
    waiverVersion: settings.waiverVersion,
    screenName,
    vehicleCallsign,
    legalName,
    email,
    phone,
    adultParticipating: body.adultParticipating === true,
    adultMediaConsent: body.adultMediaConsent === true,
    adultAttendanceDates: clean(body.adultAttendanceDates),
    signature,
    emergencyContactName: emergencyContactDeclined ? "" : clean(body.emergencyContactName),
    emergencyContactPhone: emergencyContactDeclined ? "" : clean(body.emergencyContactPhone),
    emergencyContactRelationship: emergencyContactDeclined ? "" : clean(body.emergencyContactRelationship),
    emergencyContactDeclined,
    acceptedAdultTerms,
    acceptedParentalAuthority,
    acceptedMediaScope,
    acceptedElectronicSignature,
    acknowledgedPrivacyNotice,
    children,
  });

  const event = await getEventBySlug(slug);
  if (event) {
    const commsUrl = `${SITE_URL}/comms/${slug}?token=${attendee.accessToken}`;
    try {
      const built = buildPersonalCommsLink({ recipientName: screenName, event, commsUrl });
      await sendEmail({ to: email, subject: built.subject, html: built.html });
    } catch (err) {
      console.error("Personal comms link send failed for", email, err);
      // The signed waiver is already recorded — don't fail the submission
      // over a flaky email send.
    }
  }

  return NextResponse.json({ status: "ok" });
}
