import { NextRequest, NextResponse } from "next/server";
import { isAirtableConfigured } from "@/lib/airtable";
import { processOrderFollowups, syncOrders } from "@/lib/orderFollowup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily: syncs recent Fourthwall orders into the Orders table (stamping
 * Delivered Date when Fourthwall marks one DELIVERED), then sends the next
 * due post-purchase follow-up email to opt-in customers.
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

  if (!isAirtableConfigured(process.env.AIRTABLE_NEWSLETTER_BASE_ID)) {
    return NextResponse.json({ error: "Airtable is not configured." }, { status: 500 });
  }

  // `?dry=1` syncs but doesn't send — useful for a first look at what the
  // sweep would do.
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  try {
    const sync = await syncOrders();
    if (dry) {
      return NextResponse.json({ status: "ok", dry: true, sync });
    }
    const followups = await processOrderFollowups();
    return NextResponse.json({ status: "ok", sync, followups });
  } catch (err) {
    console.error("order-followup cron error", err);
    return NextResponse.json({ error: "Sweep failed." }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
