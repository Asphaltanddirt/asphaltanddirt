import type { MetadataRoute } from "next";
import { episodes } from "@/lib/episodes";
import { builds } from "@/lib/builds";
import { HOSTS, TRAIL_AMBASSADORS } from "@/lib/team";
import { getPublishedPosts } from "@/lib/blog";
import { getFeaturedProducts } from "@/lib/fourthwall";
import { getPublishedEvents } from "@/lib/events";
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

  const teamEntries: MetadataRoute.Sitemap = [...HOSTS, ...TRAIL_AMBASSADORS].map((m) => ({
    url: `${SITE_URL}/team/${m.slug}`,
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

  // Events — same live-fetch-with-fallback pattern as merch above.
  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const { upcoming, past } = await getPublishedEvents();
    eventEntries = [...upcoming, ...past].map((e) => ({
      url: `${SITE_URL}/events/${e.slug}`,
      changeFrequency: "weekly",
    }));
  } catch {
    // Same reasoning — a transient Airtable error shouldn't fail the sitemap.
  }

  return [
    { url: SITE_URL, changeFrequency: "weekly" },
    { url: `${SITE_URL}/podcast`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/team`, changeFrequency: "monthly" },
    { url: `${SITE_URL}/builds`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/community`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/events`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/merch`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/merch/all`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/blog/all`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly" },
    { url: `${SITE_URL}/subscribe`, changeFrequency: "yearly" },
    { url: `${SITE_URL}/returns-faq`, changeFrequency: "monthly" },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly" },
    { url: `${SITE_URL}/terms-of-service`, changeFrequency: "yearly" },
    ...episodeEntries,
    ...buildEntries,
    ...teamEntries,
    ...blogEntries,
    ...merchEntries,
    ...eventEntries,
  ];
}
