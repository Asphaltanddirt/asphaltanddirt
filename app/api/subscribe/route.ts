import { NextRequest, NextResponse } from "next/server";

// Not a secret — Kit form IDs are safe to reference client-side/in code.
const FORM_ID = "9846748"; // "A&D Newsletter"

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Newsletter signup is not configured" }, { status: 500 });
  }

  const headers = {
    "X-Kit-Api-Key": apiKey,
    "Content-Type": "application/json",
  };

  // Kit's "add subscriber to form by email" endpoint 404s for this account
  // (confirmed against the live API), so subscribing happens in two steps:
  // upsert the subscriber, then attach that subscriber to the form by ID.
  // Both calls are idempotent — safe to repeat for an already-subscribed email.
  const createRes = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: email,
      referrer: `https://asphaltanddirt.com/?utm_source=asphaltanddirt.com&utm_medium=${body.source || "website"}`,
    }),
  });

  if (!createRes.ok) {
    console.error("Kit create subscriber error", createRes.status, await createRes.text());
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  const { subscriber } = (await createRes.json()) as { subscriber: { id: number } };

  const attachRes = await fetch(`https://api.kit.com/v4/forms/${FORM_ID}/subscribers/${subscriber.id}`, {
    method: "POST",
    headers,
  });

  if (!attachRes.ok) {
    console.error("Kit attach-to-form error", attachRes.status, await attachRes.text());
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ status: "subscribed" });
}
