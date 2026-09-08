import { NextRequest, NextResponse } from "next/server";
import { addSubscriber } from "@/lib/newsletterSubscribers";

/**
 * Newsletter signup. Writes straight to the Airtable Newsletter base
 * (source of truth for the list) — see lib/newsletterSubscribers.ts.
 * Single opt-in: the site UX confirms immediately, no "check your inbox"
 * step.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string; firstName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const outcome = await addSubscriber({
      email,
      source: body.source || "website",
      firstName: body.firstName?.trim() || undefined,
    });
    return NextResponse.json({
      status: outcome === "already-subscribed" ? "already-subscribed" : "subscribed",
    });
  } catch (err) {
    console.error("Newsletter subscribe error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
