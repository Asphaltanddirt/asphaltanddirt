import { NextRequest, NextResponse } from "next/server";
import { isAirtableConfigured } from "@/lib/airtable";
import { findAmbassador, sendAmbassadorWelcome } from "@/lib/ambassadorWelcomeSend";

/**
 * Sends a Road & Trail Crew welcome email.
 *
 *   POST /api/ambassador-welcome
 *   Auth: Authorization: Bearer <ADMIN_API_SECRET>   (or ?key=<ADMIN_API_SECRET>)
 *   Body (JSON) or query params:
 *     recordId  Ambassador record id — what the Airtable automation sends
 *     email     alternative lookup key
 *     part      1 (on approval, no code) | 2 (code reveal). Default 1.
 *     test      true -> send to NEWSLETTER_TEST_EMAIL, don't touch the record
 *
 * Idempotent. Part 2 needs Agreement Signed + Promo Code + Tracking Link on
 * the record; otherwise it's skipped (with a reason), never sent early.
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  if (provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable is not configured." }, { status: 500 });
  }

  let body: { recordId?: string; email?: string; part?: number | string; test?: boolean } = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const q = req.nextUrl.searchParams;
  const recordId = body.recordId || q.get("recordId") || "";
  const email = (body.email || q.get("email") || "").trim();
  const part: 1 | 2 = String(body.part ?? q.get("part") ?? "1") === "2" ? 2 : 1;
  const test = body.test === true || q.get("test") === "1";

  if (!recordId && !email) {
    return NextResponse.json({ error: "recordId or email is required." }, { status: 400 });
  }

  let ambassador;
  try {
    ambassador = await findAmbassador({ recordId: recordId || undefined, email: email || undefined });
  } catch (err) {
    console.error("ambassador-welcome lookup error", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 502 });
  }
  if (!ambassador) {
    return NextResponse.json({ error: "No ambassador record found." }, { status: 404 });
  }

  try {
    const result = await sendAmbassadorWelcome(ambassador, part, { test });
    const status = result.status === "skipped" ? 409 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("ambassador-welcome send error", err);
    return NextResponse.json({ error: "Send failed." }, { status: 502 });
  }
}
