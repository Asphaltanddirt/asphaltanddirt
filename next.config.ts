import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Jose's build was renamed Rhino Rock -> Rock Rhino (2026-09-09).
      { source: "/builds/rhino-rock", destination: "/builds/rock-rhino", permanent: true },
      // Placeholder blog stubs deleted 2026-09-08 that Google still had on file
      // (Search Console 404s, 2026-09-17): send each to the closest real page.
      { source: "/blog/overland-setup-essentials", destination: "/blog/best-overland-routes", permanent: true },
      { source: "/blog/the-gear-we-actually-use", destination: "/blog/all?category=gear", permanent: true },
      { source: "/blog/red-clay-run-community-ride-recap", destination: "/blog/why-community-rides-matter", permanent: true },
    ];
  },
};

export default nextConfig;
