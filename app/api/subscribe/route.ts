import { NextRequest, NextResponse } from "next/server";
import { addSubscriber } from "@/lib/newsletterSubscribers";
import { sendWelcomeStep } from "@/lib/newsletterWelcomeSend";

/**
 * Newsletter signup. Writes straight to the Airtable Newsletter base
 * (source of truth for the list) — see lib/newsletterSubscribers.ts.
 * Single opt-in: the site UX confirms immediately, no "check your inbox"
 * step. Welcome email 1 goes out right away; the cron paces emails 2–5.
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
  const firstName = body.firstName?.trim() || undefined;

  let result;
  try {
    result = await addSubscriber({ email, source: body.source || "website", firstName });
  } catch (err) {
    console.error("Newsletter subscribe error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }

  // New (or reactivated) subscriber -> send welcome email 1 now. Best-effort:
  // a send failure never fails the signup — the daily cron will catch step 1
  // on its next run (Welcome Step stays 0).
  if ((result.outcome === "subscribed" || result.outcome === "resubscribed") && result.id && result.token) {
    try {
      await sendWelcomeStep(
        { id: result.id, email, firstName: firstName || "", token: result.token, brand: "Asphalt & Dirt", welcomeStep: 0, subscribedDate: new Date().toISOString().slice(0, 10) },
        1,
      );
    } catch (err) {
      console.error("Welcome email 1 send failed (cron will retry)", err);
    }
  }

  return NextResponse.json({
    status: result.outcome === "already-subscribed" ? "already-subscribed" : "subscribed",
  });
}
