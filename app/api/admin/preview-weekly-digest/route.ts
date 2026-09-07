import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigestPayload } from "@/lib/newsletter";

// LOCAL-ONLY preview — never committed (see .gitignore-equivalent: this
// whole newsletter feature is intentionally held out of git for now).
// GET /api/admin/preview-weekly-digest?full=1 to include sample Trail Talk
// / Rig Of The Week content and see every section at once.
export async function GET(req: NextRequest) {
  const full = req.nextUrl.searchParams.get("full");

  const payload = await buildWeeklyDigestPayload(
    full
      ? {
          trailTalk: {
            title: "37s Or 40s?",
            body: "Would you run 40s on a daily-driven Wrangler, or is 37 the smarter sweet spot?",
            ctaText: "Join The Conversation",
            ctaUrl: "https://www.facebook.com/TeamAsphaltanddirt",
          },
          rigOfTheWeek: {
            name: "Mike's JLUR",
            blurb: "37s, beadlocks, armor, and a setup built for weekends on the trail without ruining Monday morning.",
            photoUrl: "/img/builds/iron-bandit.jpg",
            photoAlt: "Mike's JLUR",
          },
        }
      : {},
  );

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px;background:#e5e5e5;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;">${payload.content}</div>
    </body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
