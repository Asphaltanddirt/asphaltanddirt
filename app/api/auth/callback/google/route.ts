import { NextRequest, NextResponse } from "next/server";
import { consumeState, exchangeCode, findAllowedUser, recordSignIn, setSession } from "@/lib/garageAuth";

/**
 * Where Google sends people back. Three ways this ends:
 *  - not on the invite list  -> /garage?error=not_invited
 *  - something went wrong    -> /garage?error=failed
 *  - all good                -> wherever they were headed, signed in
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const fail = (error: string) => NextResponse.redirect(new URL(`/garage?error=${error}`, origin));

  if (params.get("error")) return fail("cancelled");

  const { ok, next } = await consumeState(params.get("state"));
  const code = params.get("code");
  if (!ok || !code) return fail("failed");

  try {
    const profile = await exchangeCode(code, origin);
    if (!profile.email) return fail("failed");

    const user = await findAllowedUser(profile.email);
    if (!user) return fail("not_invited");

    await setSession({ ...user, name: profile.name || user.name, photoUrl: profile.picture || user.photoUrl });
    // Non-blocking in spirit — but awaited so a failure here is visible in logs
    // rather than silently losing the "last signed in" stamp.
    try {
      await recordSignIn(user, profile);
    } catch (err) {
      console.error("garage sign-in stamp failed", err);
    }
    return NextResponse.redirect(new URL(next, origin));
  } catch (err) {
    console.error("garage sign-in failed", err);
    return fail("failed");
  }
}
