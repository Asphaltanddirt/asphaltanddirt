import { NextRequest, NextResponse } from "next/server";
import { buildFollowupEmail } from "@/lib/orderFollowup";

/**
 * Renders one of the three post-purchase follow-up emails as it would land
 * in an inbox — the body only (the CAN-SPAM footer + unsubscribe are added
 * at send time and don't need previewing here).
 *
 *   ?key=<ADMIN_API_SECRET>   required
 *   ?step=1|2|3               which email (default 1)
 *   ?name=Sam&items=Earn It Hoodie   sample data
 */
export function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const step = Math.min(3, Math.max(1, Number(req.nextUrl.searchParams.get("step")) || 1));
  const name = req.nextUrl.searchParams.get("name") || "Sam";
  const items = req.nextUrl.searchParams.get("items") || "Earn It Hoodie";

  const built = buildFollowupEmail(step, { name, items });

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order follow-up — email ${step}</title></head>
<body style="margin:0;padding:24px 0;background:#000;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto 12px;color:#8a8178;font-size:12px;padding:0 24px;">
  <b>Subject:</b> ${built.subject}<br><b>Preview:</b> ${built.previewText}
</div>
<div style="max-width:560px;margin:0 auto;background:#0f0f0f;border-radius:10px;overflow:hidden;">
  <div style="background:#000;padding:22px 24px;">
    <span style="font-size:20px;font-weight:900;color:#f4f4f2;letter-spacing:.02em;">ASPHALT <span style="color:#f86000;">&amp;</span> DIRT</span>
  </div>
  <div style="padding:28px 24px;color:#f4f4f2;font-size:15px;line-height:1.65;">
    ${built.innerHtml}
  </div>
  <div style="padding:20px 24px;border-top:1px solid #2a2824;color:#8a8178;font-size:12px;line-height:1.7;">
    <p style="margin:0 0 6px;">You're getting this because you ordered from asphaltanddirt.com and opted in to hear from us.</p>
    <p style="margin:0 0 6px;"><span style="text-decoration:underline;">Unsubscribe from these</span> — you'll still get order &amp; shipping updates.</p>
    <p style="margin:0;">[mailing address]</p>
  </div>
</div>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
