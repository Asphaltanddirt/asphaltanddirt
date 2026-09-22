import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canSeeControlRoom } from "@/lib/garageControl";
import { checkState, completeConnection } from "@/lib/threadsPost";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com";

/** Threads sends Jose back here after "Allow". Also the deauthorize and data-deletion URL. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeControlRoom(session)) return NextResponse.redirect(new URL("/garage", SITE));
  const p = req.nextUrl.searchParams;
  const back = (msg: string) => NextResponse.redirect(new URL(`/garage/control?threads=${encodeURIComponent(msg)}`, SITE));
  if (p.get("error")) return back(`declined: ${p.get("error_description") || p.get("error")}`);
  if (!checkState(p.get("state") || "")) return back("error: that login link expired, try again");
  try {
    const who = await completeConnection(p.get("code") || "", session.name || session.email);
    return back(`connected as @${who}`);
  } catch (err) {
    console.error("threads connect failed", err);
    return back(`error: ${err instanceof Error ? err.message : "couldn't connect"}`);
  }
}

/**
 * Meta posts here when the app is removed (deauthorize) or a user asks for
 * their data to be deleted. We store nothing about other users; for our own
 * account, removing the app simply stops posting.
 */
export async function POST() {
  return NextResponse.json({ url: `${SITE}/privacy-policy`, confirmation_code: `ad-${Date.now()}` });
}
