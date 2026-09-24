import { NextRequest, NextResponse } from "next/server";
import { recordReconfirm, verifyReconfirmLink, type ReconfirmAnswer } from "@/lib/rsvpReconfirm";

/** Records a re-confirm answer. Authorised by the signed link, not a login —
 *  these are attendees, not Garage users. */
export async function POST(req: NextRequest) {
  let body: { id?: string; date?: string; token?: string; answer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!verifyReconfirmLink(body.id, body.date, body.token)) {
    return NextResponse.json({ error: "That link didn't work." }, { status: 403 });
  }
  const answer = body.answer as ReconfirmAnswer;
  if (answer !== "Yes" && answer !== "No" && answer !== "Not sure") {
    return NextResponse.json({ error: "Pick one." }, { status: 400 });
  }

  try {
    await recordReconfirm(body.id as string, body.date as string, answer);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("reconfirm failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
}
