import { NextRequest, NextResponse } from "next/server";
import { getRiderEmail } from "@/lib/rallyAuth";
import { makeClaim } from "@/lib/rally";

export async function POST(req: NextRequest) {
  const email = await getRiderEmail();
  if (!email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { itemId?: string; size?: string; rank?: string; choice?: string; notes?: string };
  if (!b.itemId) return NextResponse.json({ error: "Pick something." }, { status: 400 });
  const result = await makeClaim({ email, itemId: b.itemId, size: b.size, rank: b.rank, choice: b.choice, notes: b.notes });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
