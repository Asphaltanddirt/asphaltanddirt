import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { DECISIONS, getApplication, setDecision, type Decision } from "@/lib/garageApplications";

/** Owners set a Road & Trail Crew application's Review Decision from the Garage.
 *  `decision: null` clears it (back to "needs a decision"). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });

  let body: { id?: string; decision?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const decision = body.decision ?? null;
  if (!body.id || (decision !== null && !DECISIONS.includes(decision as Decision))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const app = await getApplication(body.id);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  try {
    await setDecision(app.id, decision as Decision | null);
    return NextResponse.json({ status: "ok", decision });
  } catch (err) {
    console.error("garage application decision failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
