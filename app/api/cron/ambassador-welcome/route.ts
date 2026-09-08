import { NextRequest, NextResponse } from "next/server";
import { isAirtableConfigured } from "@/lib/airtable";
import { processPendingWelcomes } from "@/lib/ambassadorWelcomeSend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled sweep: sends any Road & Trail Crew welcome emails that staff
 * queued by ticking "Send Welcome 1" / "Send Welcome 2" on an Ambassador
 * record. Airtable automations can't call our API, so this cron does.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Also accepts
 * `ADMIN_API_SECRET` so it can be run by hand. Schedule is in vercel.json.
 */
async function run(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  const ok = (cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isAirtableConfigured()) {
    return NextResponse.json({ error: "Airtable is not configured." }, { status: 500 });
  }

  try {
    const result = await processPendingWelcomes();
    const summary = {
      part1: { processed: result.part1.length, sent: result.part1.filter((r) => r.status === "sent").length },
      part2: { processed: result.part2.length, sent: result.part2.filter((r) => r.status === "sent").length },
    };
    return NextResponse.json({ status: "ok", summary, detail: result });
  } catch (err) {
    console.error("ambassador-welcome cron error", err);
    return NextResponse.json({ error: "Sweep failed." }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
