import { NextRequest, NextResponse } from "next/server";
import { isGarageConfigured, startGoogleSignIn } from "@/lib/garageAuth";

/** "Continue with Google" — sends them to Google's sign-in screen. */
export async function GET(req: NextRequest) {
  if (!isGarageConfigured()) {
    return NextResponse.redirect(new URL("/garage?error=setup", req.nextUrl.origin));
  }
  const next = req.nextUrl.searchParams.get("next") || "/garage";
  return NextResponse.redirect(await startGoogleSignIn(next.startsWith("/") ? next : "/garage", req.nextUrl.origin));
}
