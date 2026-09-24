import { NextRequest, NextResponse } from "next/server";
import { getSession, canSeeOwnerOnly } from "@/lib/garageAuth";
import { sendEventNotice } from "@/lib/eventNotice";
import { notifyFailure } from "@/lib/notify";

export const maxDuration = 60;

// Vercel caps a request body around 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * The graphic landed. Put it on every notice card and send them all together.
 *
 * One upload, one fan-out. The alternative is attaching the same picture four
 * times from a phone in bad weather, which is how one of them gets missed —
 * and a cancellation that reached three channels out of four is the failure
 * that matters most here.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const cardIds = String(form?.get("cardIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!(file instanceof File) || cardIds.length === 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Images only." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is over 4 MB." }, { status: 400 });

  try {
    const results = await sendEventNotice({
      cardIds,
      image: {
        filename: file.name,
        contentType: file.type,
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    });

    // Anything that didn't land gets a push too — by now the screen is
    // probably in a pocket, and a half-posted cancellation is worse than
    // knowing you have to finish it by hand.
    const missed = results.filter((r) => !r.posted);
    if (missed.length) {
      await notifyFailure(
        { id: cardIds[0], name: "Cancellation notice", platform: missed.map((m) => m.platform).join(" · ") },
        "the notice didn't post everywhere — finish it by hand",
      ).catch(() => {});
    }

    return NextResponse.json({ status: "ok", results });
  } catch (err) {
    console.error("notice image failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't send it." }, { status: 500 });
  }
}
