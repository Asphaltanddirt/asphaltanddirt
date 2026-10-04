import { NextResponse } from "next/server";
import { clearRiderSession } from "@/lib/rallyAuth";

export async function POST() {
  await clearRiderSession();
  return NextResponse.json({ ok: true });
}
