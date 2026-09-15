import { NextRequest, NextResponse } from "next/server";
import { generateWeek } from "@/lib/garageTasks";

export const maxDuration = 60;

/**
 * Creates the week's Garage tasks from the active templates. Runs every
 * morning rather than only on Monday, so a week is never skipped if a run
 * fails; anything already generated for that week is left alone.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const made = await generateWeek();
    return NextResponse.json({ status: "ok", created: made.length, keys: made });
  } catch (err) {
    console.error("garage task generation failed", err);
    return NextResponse.json({ error: "Task generation failed." }, { status: 500 });
  }
}
