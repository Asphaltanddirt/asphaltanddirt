import { NextRequest, NextResponse } from "next/server";
import { canSeeOwnerOnly, getSession } from "@/lib/garageAuth";
import { saveWeeklySocials, WEEKLY_SOCIALS, type WeeklySocialKey } from "@/lib/weeklySocials";

/** Garage → Weekly Socials: save this week's hand-typed audience numbers. Owners only. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canSeeOwnerOnly(session)) return NextResponse.json({ error: "Owners only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const values: Partial<Record<WeeklySocialKey, number>> = {};
  for (const s of WEEKLY_SOCIALS) {
    const raw = String(body[s.key] ?? "").replace(/[,\s]/g, "");
    if (raw === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: `${s.label} should be a number.` }, { status: 400 });
    values[s.key] = n;
  }
  try {
    const saved = await saveWeeklySocials(values, session.name || session.email);
    return NextResponse.json({ status: "ok", saved });
  } catch (err) {
    console.error("weekly socials save failed", err);
    return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 502 });
  }
}
