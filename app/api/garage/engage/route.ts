import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { engageAction, getEngageTargets, type EngageAction } from "@/lib/engage";

const ACTIONS: EngageAction[] = ["done", "skip", "pause", "undo", "quiet"];

/** Engage list actions (Garage → Engage). Owners only. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  let body: { id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const action = ACTIONS.find((a) => a === body.action);
  if (!action) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const target = (await getEngageTargets()).find((t) => t.id === body.id);
    if (!target) return NextResponse.json({ error: "That account isn't on the list." }, { status: 404 });
    await engageAction(target.id, action, target);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("engage action failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
