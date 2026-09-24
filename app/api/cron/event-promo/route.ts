import { NextRequest, NextResponse } from "next/server";
import { runPromoPass } from "@/lib/eventPromo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily: the event promo countdown's pass (lib/eventPromo.ts).
 *
 *  1. Every upcoming Published event gets any promo cards it is still owed.
 *     Publishing in the Garage already does this straight away; the daily
 *     pass catches events published straight in Airtable, and a save whose
 *     after-work didn't finish. Past beats are skipped, never backfilled.
 *  2. The by-hand promo cards (TikTok, Facebook Group, Stories) get the
 *     fresh-facts check that the auto-poster gives its own cards at send time.
 *
 * Drafts only. Nothing here approves or posts anything.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts
 * `ADMIN_API_SECRET` (header or ?key=) for a manual run.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("key") || "";
  const ok = (cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret);
  if (!ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await runPromoPass();
    return NextResponse.json({ status: "ok", ranAt: new Date().toISOString(), ...result });
  } catch (err) {
    console.error("event promo pass failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
