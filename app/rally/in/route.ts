import { NextRequest, NextResponse } from "next/server";
import { setRiderSession, verifySignInLink } from "@/lib/rallyAuth";
import { ensureRider } from "@/lib/rally";

export const dynamic = "force-dynamic";

/** The emailed sign-in link: sets the rider cookie and goes to /rally. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const email = verifySignInLink(p.get("e"), p.get("x"), p.get("t"));
  const next = (p.get("next") || "/rally").startsWith("/") ? p.get("next") || "/rally" : "/rally";
  if (!email) return NextResponse.redirect(new URL("/rally?signin=expired", req.url));
  try {
    await ensureRider(email, "", "Sign-in");
  } catch (err) {
    console.error("rally: ensureRider on sign-in failed", err);
  }
  await setRiderSession(email);
  return NextResponse.redirect(new URL(next, req.url));
}
