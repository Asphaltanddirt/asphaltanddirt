import { NextRequest, NextResponse } from "next/server";
import { submitToIndexNow, submitSitemapToIndexNow } from "@/lib/indexNow";

/**
 * Notifies Bing (via IndexNow) about new or changed pages, so it doesn't
 * wait on its own crawler to notice. Manual trigger, same pattern as the
 * other admin routes — hit this after publishing something worth Bing
 * knowing about sooner (a new blog post, a batch of build/event updates).
 *
 *   POST with { "urls": ["https://www.asphaltanddirt.com/blog/..."] }
 *     submits just those URLs.
 *   POST with no body (or { })
 *     re-submits every URL currently in sitemap.xml — the "just tell it
 *     about everything live" sweep.
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin actions are not configured." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let urls: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.urls)) urls = body.urls;
  } catch {
    // No/invalid JSON body -> fall through to the sitemap sweep.
  }

  try {
    if (urls && urls.length > 0) {
      const result = await submitToIndexNow(urls);
      return NextResponse.json({ status: "ok", urlCount: urls.length, ...result });
    }
    const result = await submitSitemapToIndexNow();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return NextResponse.json({ error: "IndexNow submission failed.", detail: String(err) }, { status: 502 });
  }
}
