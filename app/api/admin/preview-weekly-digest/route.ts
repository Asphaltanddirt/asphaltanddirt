import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyDigest, wrapNewsletterEmail } from "@/lib/newsletter";

/**
 * Renders the weekly digest exactly as it will land in an inbox — full
 * document, footer and all — so you can eyeball it before sending.
 *
 *   ?full=1   also fills in sample Trail Talk / Rig Of The Week blocks so
 *             every section is visible at once.
 *
 * Reachable only with the admin secret:
 *   ?key=<ADMIN_API_SECRET>   or   Authorization: Bearer <ADMIN_API_SECRET>
 */
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const full = req.nextUrl.searchParams.get("full");

  const content = await buildWeeklyDigest(
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
            blurb:
              "37s, beadlocks, armor, and a setup built for weekends on the trail without ruining Monday morning.",
            photoUrl: "/img/builds/iron-bandit.jpg",
            photoAlt: "Mike's JLUR",
          },
        }
      : {},
  );

  const html = wrapNewsletterEmail(content, {
    unsubscribeUrl: "#preview-unsubscribe",
    mailingAddress: process.env.NEWSLETTER_MAILING_ADDRESS || "Asphalt & Dirt — [NEWSLETTER_MAILING_ADDRESS not set]",
  });

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
