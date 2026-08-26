import type { MetadataRoute } from "next";
import { episodes } from "@/lib/episodes";
import { builds } from "@/lib/builds";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const episodeEntries: MetadataRoute.Sitemap = episodes.map((e) => ({
    url: `${SITE_URL}/podcast/${e.slug}`,
    lastModified: e.publicationDate,
    changeFrequency: "monthly",
  }));

  const buildEntries: MetadataRoute.Sitemap = builds.map((b) => ({
    url: `${SITE_URL}/builds/${b.slug}`,
    changeFrequency: "monthly",
  }));

  return [
    { url: SITE_URL, changeFrequency: "weekly" },
    { url: `${SITE_URL}/podcast`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/team`, changeFrequency: "monthly" },
    { url: `${SITE_URL}/builds`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/community`, changeFrequency: "weekly" },
    ...episodeEntries,
    ...buildEntries,
  ];
}
