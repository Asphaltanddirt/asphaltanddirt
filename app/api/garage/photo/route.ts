import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { setFlag, setStar, type FlagReason } from "@/lib/garageMedia";

const REASONS: FlagReason[] = ["Kids / privacy", "Inappropriate", "Poor quality", "Other"];

/**
 * Star or flag one event photo.
 *  - star: any signed-in crew member, on or off, for themselves.
 *  - flag: any signed-in crew member — it hides the photo straight away.
 *  - unflag: Owners only, so a hidden photo can't be quietly put back.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: {
    key?: string;
    eventSlug?: string;
    photoUrl?: string;
    action?: "star" | "unstar" | "flag" | "unflag";
    reason?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const key = (body.key || "").trim();
  const seed = { eventSlug: (body.eventSlug || "").trim(), photoUrl: (body.photoUrl || "").trim() };
  if (!key || !seed.eventSlug) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    switch (body.action) {
      case "star":
      case "unstar": {
        const stars = await setStar(key, seed, session.email, body.action === "star");
        revalidateTag("garage-photo-marks", { expire: 0 });
        return NextResponse.json({ status: "ok", stars });
      }
      case "flag": {
        const reason = (body.reason || "Other") as FlagReason;
        if (!REASONS.includes(reason)) return NextResponse.json({ error: "Pick a reason." }, { status: 400 });
        await setFlag(key, seed, session.email, { reason, note: (body.note || "").trim() });
        revalidateTag("garage-photo-marks", { expire: 0 });
        return NextResponse.json({ status: "ok", hidden: true });
      }
      case "unflag": {
        if (!canSeeOwnerOnly(session)) {
          return NextResponse.json({ error: "Only Jose or Anthony can put a photo back." }, { status: 403 });
        }
        await setFlag(key, seed, session.email, null);
        revalidateTag("garage-photo-marks", { expire: 0 });
        return NextResponse.json({ status: "ok", hidden: false });
      }
      default:
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
  } catch (err) {
    console.error("garage photo mark failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
