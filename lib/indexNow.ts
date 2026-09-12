import { SITE_URL } from "@/lib/site";

// IndexNow: a single ping tells Bing (and Yandex) about new/changed URLs
// instead of waiting for their crawler to notice on its own. Google doesn't
// participate in IndexNow, but Bing does — and Bing's index is what ChatGPT's
// web search reads from, so this is the fastest way to get new content in
// front of both.
//
// Key generated in Bing Webmaster Tools -> IndexNow -> Get Started, hosted as
// public/db19c27cf57949eab85a7920c9598ee8.txt so it's served at the site root.
const INDEXNOW_KEY = "db19c27cf57949eab85a7920c9598ee8";
const INDEXNOW_URL = "https://api.indexnow.org/indexnow";

function hostFromUrl(url: string) {
  return new URL(url).host;
}

/** Submits up to 10,000 URLs in one call. Silently no-ops on an empty list —
 *  callers don't need to guard against that themselves. */
export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; httpStatus: number; body?: string }> {
  if (urls.length === 0) return { ok: true, httpStatus: 0 };

  const res = await fetch(INDEXNOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: hostFromUrl(SITE_URL),
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });

  // IndexNow returns 200 or 202 with an empty body on success.
  if (res.ok) return { ok: true, httpStatus: res.status };
  return { ok: false, httpStatus: res.status, body: await res.text().catch(() => undefined) };
}

/** Pulls every <loc> out of the site's own sitemap.xml and submits the lot —
 *  the simple "notify about everything currently live" sweep, used for the
 *  initial catch-up and for ad-hoc re-notification after a batch of changes. */
export async function submitSitemapToIndexNow(): Promise<{ ok: boolean; httpStatus: number; body?: string; urlCount: number }> {
  const res = await fetch(`${SITE_URL}/sitemap.xml`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Couldn't fetch sitemap.xml: ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const result = await submitToIndexNow(urls);
  return { ...result, urlCount: urls.length };
}
