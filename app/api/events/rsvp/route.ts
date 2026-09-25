import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, createRsvp } from "@/lib/events";
import { buildRsvpConfirmation } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { addSubscriber, type Topic } from "@/lib/newsletterSubscribers";
import { sendWelcomeStep } from "@/lib/newsletterWelcomeSend";
import { requirementsFor, requirementsRecord } from "@/lib/vehicleRules";

const FB_GROUP_VALUES = new Set(["Yes", "No", "Not Sure"]);
/** The "How did you hear about this?" choices. Anything else is dropped. */
const HEARD_ABOUT = new Set(["TikTok", "Instagram", "Facebook", "X", "Threads", "YouTube", "Newsletter", "Friend", "Other"]);

export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    name?: string;
    email?: string;
    phone?: string;
    alreadyInFbGroup?: string;
    joinEventUpdatesList?: boolean;
    joinNewsletter?: boolean;
    requirementsAccepted?: boolean;
    /** Promo measurement: `?src=` / `&v=` from the link they arrived on. */
    source?: string;
    variant?: string;
    heardAbout?: string;
    company?: string; // honeypot
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  const slug = body.slug?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim();
  const phone = body.phone?.trim() || undefined;
  const alreadyInFbGroup = FB_GROUP_VALUES.has(body.alreadyInFbGroup || "")
    ? (body.alreadyInFbGroup as "Yes" | "No" | "Not Sure")
    : "Not Sure";
  const joinEventUpdatesList = Boolean(body.joinEventUpdatesList);
  const joinNewsletter = Boolean(body.joinNewsletter);
  // These come from a URL anyone can edit, so only a short plain code is kept.
  const source = typeof body.source === "string" && /^[a-z0-9-]{1,30}$/.test(body.source) ? body.source : undefined;
  const variant = body.variant === "A" || body.variant === "B" ? body.variant : undefined;
  const heardAbout = typeof body.heardAbout === "string" && HEARD_ABOUT.has(body.heardAbout) ? body.heardAbout : undefined;

  if (!slug || !name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
  }
  // Staff call people who aren't answering Tailgate chat on the day.
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "A phone number is required so staff can reach you on the day." }, { status: 400 });
  }

  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "That event couldn't be found." }, { status: 404 });
  }
  // Nobody gets on the list without agreeing to the event's requirements
  // (its own items plus state forest rules where they apply).
  const requirements = requirementsFor(event);
  if (requirements && body.requirementsAccepted !== true) {
    return NextResponse.json({ error: "Please read the Requirements and tick the box to agree." }, { status: 400 });
  }

  await createRsvp({
    eventRecordId: event.id,
    name,
    email,
    phone,
    alreadyInFbGroup,
    joinEventUpdatesList,
    joinNewsletter,
    requirementsAccepted: requirements ? requirementsRecord(requirements) : undefined,
    source,
    variant,
    heardAbout,
  });

  // Best-effort: the RSVP is already saved even if the email or the Event
  // Updates opt-in fails, so neither failure should fail the request.
  try {
    const confirmation = buildRsvpConfirmation({
      rsvpName: name,
      alreadyInFbGroup,
      event,
      joinedEventUpdates: joinEventUpdatesList,
      joinedNewsletter: joinNewsletter,
    });
    await sendEmail({ to: email, subject: confirmation.subject, html: confirmation.html, replyTo: "team@asphaltanddirt.com" });
  } catch (err) {
    console.error("RSVP confirmation email failed", err);
  }

  const topics: Topic[] = [
    ...(joinEventUpdatesList ? (["Event Updates"] as Topic[]) : []),
    ...(joinNewsletter ? (["Newsletter"] as Topic[]) : []),
  ];
  if (topics.length > 0) {
    try {
      const firstName = name.split(/\s+/)[0];
      const result = await addSubscriber({ email, firstName, phone, topics, source: "event_rsvp" });
      const isNewOrReactivated = result.outcome === "subscribed" || result.outcome === "resubscribed";
      if (isNewOrReactivated && joinNewsletter && result.id && result.token) {
        await sendWelcomeStep(
          { id: result.id, email, firstName, token: result.token, brand: "Asphalt & Dirt", welcomeStep: 0, subscribedDate: new Date().toISOString().slice(0, 10) },
          1,
        );
      }
    } catch (err) {
      console.error("RSVP -> subscribe failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
