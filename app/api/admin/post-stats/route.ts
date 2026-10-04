import { NextRequest, NextResponse } from "next/server";
import { livePostStats } from "@/lib/socialStatsSync";
import { todayNY } from "@/lib/garageTasks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Read-only: live numbers for one day's posts (?date=YYYY-MM-DD, default today). Writes nothing. */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date") || todayNY();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "date=YYYY-MM-DD" }, { status: 400 });
  return NextResponse.json(await livePostStats(date));
}
