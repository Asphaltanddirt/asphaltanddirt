import { NextRequest, NextResponse } from "next/server";
import { getAllPostsSorted, getPostBySlug } from "@/lib/blog";
import { buildBroadcastPayload } from "@/lib/newsletter";

/**
 * Creates a Kit broadcast DRAFT (send_at: null) from a blog post — never
 * sends. Reviewing and sending happens by hand in Kit's own dashboard,
 * same as every other outward-facing action in this project requiring an
 * explicit human go-ahead rather than a silent auto-send.
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

  const slug = req.nextUrl.searchParams.get("slug");
  const post = slug ? getPostBySlug(slug) : getAllPostsSorted().find((p) => p.body);

  if (!post) {
    return NextResponse.json(
      { error: slug ? `No published post found for slug "${slug}".` : "No published posts exist yet." },
      { status: 404 },
    );
  }

  const payload = buildBroadcastPayload(post);

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
    post: { slug: post.slug, title: post.title },
    broadcast: data.broadcast ?? data,
  });
}
