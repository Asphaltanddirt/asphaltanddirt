import { NextResponse } from "next/server";
import { getRiderEmail } from "@/lib/rallyAuth";
import { activeTopicsForEmail, type Topic } from "@/lib/newsletterSubscribers";

/** Which email lists the signed-in Rally member is already on, so the RSVP
 *  form can hide those boxes (Jose 10/8). Signed-out callers get nothing. */
export async function GET() {
  const email = await getRiderEmail();
  if (!email) return NextResponse.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const topics: Topic[] = await activeTopicsForEmail(email).catch(() => []);
  return NextResponse.json(
    { signedIn: true, newsletter: topics.includes("Newsletter"), eventUpdates: topics.includes("Event Updates") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
