import { NextRequest, NextResponse } from "next/server";
import { getAllPostsSorted, getPostBySlug } from "@/lib/blog";
import { buildBlogAnnouncement } from "@/lib/newsletter";
import { sendNewsletter } from "@/lib/newsletterSend";

/**
 * Sends a "just published" newsletter for one blog post over the Airtable
 * subscriber list via Resend.
 *
 *   ?slug=<post-slug>   which post (defaults to the newest published one)
 *   ?mode=test          (default) one copy to NEWSLETTER_TEST_EMAIL
 *   ?mode=live          personalized copy to every Active subscriber
 *
 * Live sending is the explicit human go-ahead — there's no separate
 * dashboard step. Review with mode=test first.
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  const mode = req.nextUrl.searchParams.get("mode") === "live" ? "live" : "test";
  const post = slug ? getPostBySlug(slug) : getAllPostsSorted().find((p) => p.body);

  if (!post) {
    return NextResponse.json(
      { error: slug ? `No published post found for slug "${slug}".` : "No published posts exist yet." },
      { status: 404 },
    );
  }

  try {
    const content = buildBlogAnnouncement(post);
    const result = await sendNewsletter(content, mode);
    return NextResponse.json({ post: { slug: post.slug, title: post.title }, subject: content.subject, ...result });
  } catch (err) {
    console.error("send-blog-email error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 502 },
    );
  }
}
