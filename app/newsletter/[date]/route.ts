import { getSentIssue, issuePath } from "@/lib/newsletterArchive";
import { SITE_URL } from "@/lib/site";

/**
 * One issue of The Dirt Line as a web page: the email exactly as it went
 * out, plus a slim A&D bar (Subscribe, Past issues). It's the target of the
 * "View in browser" link and an indexable page of its own (Jose 10/8).
 * Served as its own HTML document so the email's inline styles render as
 * they do in the inbox, untouched by the site's CSS.
 */
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const issue = await getSentIssue(date).catch(() => undefined);
  if (!issue) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

  const url = `${SITE_URL}${issuePath(issue.date)}`;
  const nice = new Date(`${issue.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const description = issue.previewText || `The Dirt Line, ${nice}: the weekly Asphalt & Dirt newsletter.`;

  let html = issue.html
    // The web copy doesn't need the link that points to itself, and the
    // opt-out links only work from someone's own inbox.
    .replace(/<!--ad-webversion-->[\s\S]*?<!--\/ad-webversion-->/g, "")
    .replace(/<!--ad-optout-->[\s\S]*?<!--\/ad-optout-->/g, "")
    // Issues archived before the markers existed.
    .replace(/<p[^>]*>\s*<a href="[^"]*\/manage\?token=[^"]*"[\s\S]*?Unsubscribe<\/a>\s*<\/p>/g, "");

  const head = `<link rel="canonical" href="${url}">
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(issue.subject)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Asphalt &amp; Dirt">
<link rel="icon" href="/icon.png">`;
  const bar = `<div style="max-width:600px;margin:0 auto 16px;padding:0 24px;font-family:Arial,sans-serif;font-size:13px;color:#555;display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:space-between;align-items:center;">
<a href="${SITE_URL}" style="color:#1a1712;font-weight:bold;text-decoration:none;">Asphalt &amp; Dirt</a>
<span>The Dirt Line &middot; ${esc(nice)}</span>
<span><a href="${SITE_URL}/newsletter" style="color:#555;">Past issues</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}/subscribe?source=newsletter_web" style="color:#F86000;font-weight:bold;text-decoration:none;">Get it every Thursday</a></span>
</div>`;

  html = html.replace("</head>", `${head}\n</head>`).replace(/(<body[^>]*>)/, `$1\n${bar}`);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
