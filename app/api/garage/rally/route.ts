import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { adjustPoints, runRallySweep, setClaimStatus } from "@/lib/rally";

/** Garage → Rally Rewards (owners): close/cancel claims, adjust points, run the sweep now. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; status?: string; email?: string; points?: number; label?: string };
  const by = session.name || session.email;
  try {
    if (b.action === "claim" && b.id && (b.status === "In progress" || b.status === "Done" || b.status === "Cancelled")) {
      await setClaimStatus(b.id, b.status, by);
    } else if (b.action === "adjust" && b.email && Number.isFinite(Number(b.points)) && Number(b.points) !== 0) {
      await adjustPoints(b.email, Math.round(Number(b.points)), b.label || "Adjustment", by);
    } else if (b.action === "sweep") {
      return NextResponse.json({ ok: true, sweep: await runRallySweep() });
    } else {
      return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
