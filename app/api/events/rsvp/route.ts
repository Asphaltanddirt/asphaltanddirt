import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, createRsvp } from "@/lib/events";
import { buildRsvpConfirmation } from "@/lib/eventEmails";
import { sendEmail } from "@/lib/resendEmail";
import { addSubscriber, type Topic } from "@/lib/newsletterSubscribers";
import { sendWelcomeStep } from "@/lib/newsletterWelcomeSend";

const FB_GROUP_VALUES = new Set(["Yes", "No", "Not Sure"]);

export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    name?: string;
    email?: string;
    phone?: string;
    alreadyInFbGroup?: string;
    joinEventUpdatesList?: boolean;
    joinNewsletter?: boolean;
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

  if (!slug || !name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
  }

  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "That event couldn't be found." }, { status: 404 });
  }

  await createRsvp({
    eventRecordId: event.id,
    name,
    email,
    phone,
    alreadyInFbGroup,
    joinEventUpdatesList,
    joinNewsletter,
  });

  // Best-effort: the RSVP is already saved even if the email or the Event
  // Updates opt-in fails, so neither failure should fail the request.
  try {
    const confirmation = buildRsvpConfirmation({ rsvpName: name, alreadyInFbGroup, event });
    await sendEmail({ to: email, subject: confirmation.subject, html: confirmation.html });
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
