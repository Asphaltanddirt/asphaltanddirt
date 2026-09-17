import { NextRequest, NextResponse } from "next/server";
import { syncAutomaticEntries } from "@/lib/garageFinance";

export const maxDuration = 60;

/** Daily: adds due recurring costs, Paid sponsors and Paid ambassador
 *  commissions to the A&D Finance base (nothing is added twice). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const added = await syncAutomaticEntries();
    return NextResponse.json({ status: "ok", added });
  } catch (err) {
    console.error("finance cron failed", err);
    return NextResponse.json({ error: "Finance sync failed." }, { status: 502 });
  }
}
