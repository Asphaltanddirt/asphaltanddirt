import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Deliberately permissive for AI crawlers: the goal here is visibility and
// citations (growth/discovery), not protecting paywalled or licensed
// content, so both "training" bots (GPTBot, Google-Extended, CCBot,
// anthropic-ai) and "retrieval/answer" bots (OAI-SearchBot, ChatGPT-User,
// PerplexityBot, Claude-SearchBot, Claude-User) are allowed. Revisit this if
// that calculus ever changes (e.g. original content worth protecting from
// training use) — see the GEO/SEO strategy doc.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
