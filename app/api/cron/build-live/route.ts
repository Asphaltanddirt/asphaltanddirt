import { NextRequest, NextResponse } from "next/server";
import { sweepBuildLiveEmails } from "@/lib/buildEmails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hourly sweep: emails each approved build's owner the link to their new
 * page, once ("Live Email Sent" on the Submissions record). Approving in the
 * Garage already sends it; this catches builds approved straight in Airtable
 * and any send that failed.
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

  try {
    const result = await sweepBuildLiveEmails();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("build-live cron error", err);
    return NextResponse.json({ error: "Sweep failed." }, { status: 502 });
  }
}

export const GET = run;
