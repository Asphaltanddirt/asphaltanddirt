import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { COME_AGAIN, saveFeedback, type ComeAgain } from "@/lib/eventFeedback";

/** Saves one "how was it?" answer. Open to anyone with the event's link (it's
 *  in every thank-you email); the hidden `website` field catches bots. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: { name?: string; howWasIt?: string; comeAgain?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ status: "ok" });
  const howWasIt = (body.howWasIt || "").trim();
  const comeAgain = (COME_AGAIN as readonly string[]).includes(body.comeAgain || "") ? (body.comeAgain as ComeAgain) : "";
  if (!howWasIt && !comeAgain) return NextResponse.json({ error: "Tell us something first." }, { status: 400 });

  const event = await getEventBySlug(slug).catch(() => null);
  if (!event) return NextResponse.json({ error: "That event wasn't found." }, { status: 404 });
  try {
    await saveFeedback({ slug, name: (body.name || "").trim(), howWasIt, comeAgain });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("event feedback failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
}
