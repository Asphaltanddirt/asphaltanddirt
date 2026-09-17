import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { canSeeFinance, cleanRecurring, saveRecurring } from "@/lib/garageFinance";

/** Jose + Anthony add or edit ({ id, ... }) a recurring cost. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canSeeFinance(session)) return NextResponse.json({ error: "Not available on your account." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = cleanRecurring(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const id = typeof body.id === "string" && /^rec[A-Za-z0-9]{14}$/.test(body.id) ? body.id : null;
    return NextResponse.json({ status: "ok", recurring: await saveRecurring(id, input) });
  } catch (err) {
    console.error("garage finance recurring save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
