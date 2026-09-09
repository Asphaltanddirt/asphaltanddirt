import { NextRequest, NextResponse } from "next/server";
import { isAirtableConfigured } from "@/lib/airtable";
import { processWelcomeSequence } from "@/lib/newsletterWelcomeSend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily sweep: sends the next due email in the 5-part newsletter welcome
 * sequence to each subscriber who's mid-sequence. Email 1 is sent inline
 * at signup; this handles 2–5, paced by Subscribed Date + the schedule in
 * lib/newsletterWelcome.ts.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts
 * `ADMIN_API_SECRET` for manual runs. Schedule is in vercel.json.
 */
async function run(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  const ok = (cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable is not configured." }, { status: 500 });
  }

  try {
    const result = await processWelcomeSequence();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("newsletter-welcome cron error", err);
    return NextResponse.json({ error: "Sweep failed." }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
