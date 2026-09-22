import { NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canSeeControlRoom } from "@/lib/garageControl";
import { connectUrl, isThreadsAppConfigured } from "@/lib/threadsPost";

/** Control Room → Connect Threads: sends Jose to Threads to allow A&D Posting. */
export async function GET() {
  const session = await getSession();
  if (!session || !canSeeControlRoom(session)) return NextResponse.redirect(new URL("/garage", process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com"));
  if (!isThreadsAppConfigured()) return NextResponse.json({ error: "THREADS_APP_ID / THREADS_APP_SECRET aren't set in Vercel yet." }, { status: 500 });
  return NextResponse.redirect(connectUrl());
}
