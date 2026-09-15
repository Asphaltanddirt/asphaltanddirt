import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/garageAuth";

export async function POST(req: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/garage", req.nextUrl.origin), { status: 303 });
}
