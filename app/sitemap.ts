import type { MetadataRoute } from "next";
import { episodes } from "@/lib/episodes";
import { builds } from "@/lib/builds";
import { getPublishedPosts } from "@/lib/blog";
import { getFeaturedProducts } from "@/lib/fourthwall";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const episodeEntries: MetadataRoute.Sitemap = episodes.map((e) => ({
    url: `${SITE_URL}/podcast/${e.slug}`,
    lastModified: e.publicationDate,
    changeFrequency: "monthly",
  }));

  const buildEntries: MetadataRoute.Sitemap = builds.map((b) => ({
    url: `${SITE_URL}/builds/${b.slug}`,
    changeFrequency: "monthly",
  }));

  const blogEntries: MetadataRoute.Sitemap = getPublishedPosts().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "monthly",
  }));

  // Merch product pages — fetched live so new/removed products stay in sync
  // without a code change. Falls back to an empty list on any API error
  // rather than failing the whole sitemap build.
  let merchEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await getFeaturedProducts("all", 100);
    merchEntries = products.map((p) => ({
      url: `${SITE_URL}/merch/${p.slug}`,
      changeFrequency: "weekly",
    }));
  } catch {
    // Sitemap generation shouldn't fail the build over a transient API error.
  }

  return [
    { url: SITE_URL, changeFrequency: "weekly" },
    { url: `${SITE_URL}/podcast`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/team`, changeFrequency: "monthly" },
    { url: `${SITE_URL}/builds`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/community`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/merch`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/merch/all`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/blog/all`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly" },
    { url: `${SITE_URL}/returns-faq`, changeFrequency: "monthly" },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly" },
    { url: `${SITE_URL}/terms-of-service`, changeFrequency: "yearly" },
    ...episodeEntries,
    ...buildEntries,
    ...blogEntries,
    ...merchEntries,
  ];
}
