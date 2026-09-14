// Single source of truth for the canonical site origin, used for canonical
// URLs, JSON-LD, Open Graph, IndexNow and the sitemap. The live site serves
// from www and the apex 308-redirects there, so canonicals must use www —
// otherwise every page points search engines at a redirect. The apex is
// normalized to www even if NEXT_PUBLIC_SITE_URL is still set to it.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.asphaltanddirt.com")
  .replace(/\/$/, "")
  .replace("://asphaltanddirt.com", "://www.asphaltanddirt.com");

export const SITE_NAME = "Asphalt & Dirt";
export const SITE_DESCRIPTION =
  "Built street rides, off-road beasts & real talk about it all — the Asphalt & Dirt podcast, builds, community, and merch.";
