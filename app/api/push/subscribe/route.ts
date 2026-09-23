import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/garageAuth";
import { saveDevice, removeDevice, publicKey, isPushConfigured } from "@/lib/push";
import { sendTestNotification } from "@/lib/notify";

/**
 * Register or drop this device for push.
 *
 * Signed-in Garage users only — a subscription is tied to a person, and the
 * notifier sends by email address.
 */

export async function GET() {
  return NextResponse.json({ configured: isPushConfigured(), publicKey: publicKey() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; label?: string; test?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { endpoint, keys, label } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Incomplete subscription." }, { status: 400 });
  }

  try {
    await saveDevice({
      label: label || `${session.name || session.email} — device`,
      email: session.email,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    // A subscription nobody has seen work is not worth much.
    const tested = body.test === false ? false : await sendTestNotification();
    return NextResponse.json({ status: "ok", tested });
  } catch (err) {
    console.error("push subscribe failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not save." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "No endpoint." }, { status: 400 });

  await removeDevice(body.endpoint);
  return NextResponse.json({ status: "ok" });
}
