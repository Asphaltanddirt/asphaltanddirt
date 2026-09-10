import { NextRequest, NextResponse } from "next/server";
import { unsubscribeOrderByToken } from "@/lib/orderFollowup";

export const dynamic = "force-dynamic";

function shell(title: string, bodyHtml: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${title}</title></head>
    <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#0f0f0f;color:#f4f4f2;display:flex;min-height:100vh;align-items:center;justify-content:center;">
      <div style="max-width:440px;padding:40px 28px;text-align:center;">
        <p style="font-size:20px;font-weight:900;margin:0 0 16px;">ASPHALT <span style="color:#f86000;">&amp;</span> DIRT</p>
        ${bodyHtml}
        <p style="margin-top:28px;"><a href="https://asphaltanddirt.com" style="color:#f86000;font-weight:bold;text-decoration:none;font-size:14px;">Back to Asphalt &amp; Dirt &rarr;</a></p>
      </div>
    </body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * GET shows a confirm button (so link scanners can't silently unsubscribe
 * on prefetch). POST does it — also the RFC 8058 one-click target.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) {
    return shell(
      "Link not recognized",
      `<p style="font-size:15px;line-height:1.6;color:#bbb1aa;margin:0;">This unsubscribe link is missing its token.</p>`,
      400,
    );
  }
  return shell(
    "Stop the post-order emails?",
    `<p style="font-size:15px;line-height:1.6;color:#bbb1aa;margin:0 0 22px;">Confirm and we won't send any more follow-up emails about your order. You'll still get order and shipping updates.</p>
     <form method="POST" action="/api/order-followup/unsubscribe?token=${encodeURIComponent(token)}">
       <button type="submit" style="background:#f86000;color:#000;border:0;padding:13px 26px;border-radius:4px;font-weight:bold;font-size:14px;cursor:pointer;">Unsubscribe</button>
     </form>`,
  );
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const result = await unsubscribeOrderByToken(token);
  if (result === "not-found") {
    return shell(
      "Link not recognized",
      `<p style="font-size:15px;line-height:1.6;color:#bbb1aa;margin:0;">We couldn't match this link to an order. It may have already been used.</p>`,
      404,
    );
  }
  return shell(
    "You're unsubscribed",
    `<p style="font-size:15px;line-height:1.6;color:#bbb1aa;margin:0;">Done — no more follow-up emails about your order. Order and shipping updates still come through as normal.</p>`,
  );
}
