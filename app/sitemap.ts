import type { MetadataRoute } from "next";
import { episodes } from "@/lib/episodes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const episodeEntries: MetadataRoute.Sitemap = episodes.map((e) => ({
    url: `${SITE_URL}/podcast/${e.slug}`,
    lastModified: e.publicationDate,
    changeFrequency: "monthly",
  }));

  return [
    { url: SITE_URL, changeFrequency: "weekly" },
    { url: `${SITE_URL}/podcast`, changeFrequency: "weekly" },
    { url: `${SITE_URL}/team`, changeFrequency: "monthly" },
    ...episodeEntries,
  ];
}
