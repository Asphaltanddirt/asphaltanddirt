import { NextRequest, NextResponse } from "next/server";
import { runRetention } from "@/lib/retention";

export const maxDuration = 60;

/** Daily cleanup that keeps the Event Privacy Policy's retention schedule true
 *  (see lib/retention.ts for what it deletes and what it leaves alone). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runRetention();
    if (result.errors.length) console.error("retention errors", result.errors);
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("retention run failed", err);
    return NextResponse.json({ error: "Retention run failed." }, { status: 500 });
  }
}
