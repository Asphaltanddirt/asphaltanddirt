import { NextRequest, NextResponse } from "next/server";
import { getRiderEmail } from "@/lib/rallyAuth";
import { saveProfile } from "@/lib/rally";

export async function POST(req: NextRequest) {
  const email = await getRiderEmail();
  if (!email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    birthMonth?: number;
    birthYear?: number;
    boardOptOut?: boolean;
  };
  const rider = await saveProfile(email, {
    firstName: typeof b.firstName === "string" ? b.firstName : undefined,
    lastName: typeof b.lastName === "string" ? b.lastName : undefined,
    birthMonth: Number(b.birthMonth) || undefined,
    birthYear: Number(b.birthYear) || undefined,
    boardOptOut: typeof b.boardOptOut === "boolean" ? b.boardOptOut : undefined,
  });
  if (!rider) return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
