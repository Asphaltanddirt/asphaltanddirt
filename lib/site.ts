// Single source of truth for the canonical site origin, used for canonical
// URLs, JSON-LD, Open Graph, and the sitemap. Override via
// NEXT_PUBLIC_SITE_URL in Vercel's project env vars once the custom domain
// is finalized (apex vs. www) — see the GEO/SEO strategy doc for why this
// matters right now (the apex domain isn't yet pointed at this deployment).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://asphaltanddirt.com";

export const SITE_NAME = "Asphalt & Dirt";
export const SITE_DESCRIPTION =
  "Built street rides, off-road beasts & real talk about it all — the Asphalt & Dirt podcast, builds, community, and merch.";
