import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resendEmail";
import { signInLink } from "@/lib/rallyAuth";
import { isRallyConfigured } from "@/lib/rally";

/** Emails a one-hour sign-in link. Always answers the same way, so the form
 *  can't be used to find out who has an account. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
  if (!isRallyConfigured()) return NextResponse.json({ error: "Rally Rewards isn't set up yet." }, { status: 503 });

  const link = signInLink(email);
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1712;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#F86000;">Rally Rewards by A&amp;D</p>
  <h1 style="margin:0 0 16px;font-size:24px;">Your sign-in link</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a453f;">Tap the button to see your Rally Points. The link works for one hour.</p>
  <p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;background:#F86000;color:#1a1712;font-weight:bold;text-decoration:none;padding:14px 28px;">Sign In &rarr;</a></p>
  <p style="margin:0;font-size:13px;color:#7a746c;">Didn't ask for this? Ignore it; nothing happens.</p>
</div>`;
  try {
    await sendEmail({ to: email, subject: "Your Rally Rewards sign-in link", html, replyTo: "crew@asphaltanddirt.com" });
  } catch (err) {
    console.error("rally sign-in email failed", err);
    return NextResponse.json({ error: "We couldn't send the email. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
