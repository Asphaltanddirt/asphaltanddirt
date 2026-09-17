import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { createAmbassadorCode, getAmbassadorRecord, toOnboarding } from "@/lib/ambassadorOnboarding";
import { sendAmbassadorWelcome } from "@/lib/ambassadorWelcomeSend";

/**
 * Owners onboard an accepted ambassador from the Garage:
 *   { ambassadorId, action: "welcome1" }
 *   { ambassadorId, action: "code", code, percent, useExisting? }
 *   { ambassadorId, action: "welcome2" }
 * Welcome 2 stays a button on purpose (Jose, 9/17): someone sees it go out.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { ambassadorId?: string; action?: string; code?: unknown; percent?: unknown; useExisting?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const record = await getAmbassadorRecord(body.ambassadorId || "").catch(() => null);
  if (!record) return NextResponse.json({ error: "Ambassador record not found." }, { status: 404 });

  if (body.action === "code") {
    try {
      const result = await createAmbassadorCode(record, body.code, body.percent, body.useExisting === true);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, canUseExisting: result.canUseExisting }, { status: result.status });
      }
      return NextResponse.json({ status: "ok", onboarding: result.onboarding });
    } catch (err) {
      console.error("garage create code failed", err);
      return NextResponse.json(
        {
          error:
            "The code may have been made in Fourthwall but didn't save here. Tap Create code again; if it says the code already exists, choose Use that one.",
        },
        { status: 502 },
      );
    }
  }

  if (body.action === "welcome1" || body.action === "welcome2") {
    const part = body.action === "welcome1" ? 1 : 2;
    try {
      const result = await sendAmbassadorWelcome(record, part);
      if (result.status === "skipped") {
        return NextResponse.json({ error: `Not sent: ${result.reason}.` }, { status: 409 });
      }
      const fresh = await getAmbassadorRecord(record.id);
      return NextResponse.json({ status: result.status, onboarding: fresh ? toOnboarding(fresh) : null });
    } catch (err) {
      console.error(`garage welcome ${part} failed`, err);
      return NextResponse.json({ error: "The email didn't send. Try again in a minute." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
