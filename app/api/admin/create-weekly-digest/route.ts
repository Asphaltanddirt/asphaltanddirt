import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigestPayload, type WeeklyDigestOptions } from "@/lib/newsletter";

/**
 * Creates a Kit broadcast DRAFT (send_at: null) for the weekly digest —
 * feature story, build spotlight, gear verdict, what's coming up, quick
 * hits, and a closing community CTA, auto-assembled from live site data.
 * Reviewing, trimming sections, and sending happens by hand in Kit's own
 * dashboard, same as every other outward-facing action in this project
 * requiring an explicit human go-ahead rather than a silent auto-send.
 *
 * POST body (all optional — omit a section entirely if you don't have
 * content for it this week):
 *   {
 *     "trailTalk": { "title": "...", "body": "...", "ctaText": "...", "ctaUrl": "..." },
 *     "rigOfTheWeek": { "name": "...", "blurb": "...", "photoUrl": "...", "photoAlt": "...", "ctaUrl": "..." }
 *   }
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const kitApiKey = process.env.KIT_API_KEY;
  if (!kitApiKey) {
    return NextResponse.json({ error: "Kit is not configured." }, { status: 500 });
  }

  let options: WeeklyDigestOptions = {};
  try {
    const body = await req.text();
    if (body) options = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = await buildWeeklyDigestPayload(options);

  const res = await fetch("https://api.kit.com/v4/broadcasts", {
    method: "POST",
    headers: {
      "X-Kit-Api-Key": kitApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Kit broadcast create error", res.status, await res.text());
    return NextResponse.json({ error: "Failed to create the Kit broadcast draft." }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    status: "draft_created",
    subject: payload.subject,
    broadcast: data.broadcast ?? data,
  });
}
