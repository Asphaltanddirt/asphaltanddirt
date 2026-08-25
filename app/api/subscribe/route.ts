import { NextRequest, NextResponse } from "next/server";

// Not a secret — Beehiiv publication IDs are safe to reference client-side/in code.
const PUBLICATION_ID = "pub_2fe06208-4acc-4f6a-81ad-98ac9c5e0ed3";

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

  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Newsletter signup is not configured" }, { status: 500 });
  }

  const beehiivRes = await fetch(
    `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "asphaltanddirt.com",
        utm_medium: body.source || "website",
      }),
    }
  );

  if (!beehiivRes.ok) {
    const errorBody = await beehiivRes.text();
    // Beehiiv returns 400 for "already subscribed" — treat that as a success from the user's POV.
    if (beehiivRes.status === 400 && errorBody.includes("already been taken")) {
      return NextResponse.json({ status: "already_subscribed" });
    }
    console.error("Beehiiv subscribe error", beehiivRes.status, errorBody);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ status: "subscribed" });
}
