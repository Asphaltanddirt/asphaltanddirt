import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Jose's build was renamed Rhino Rock -> Rock Rhino (2026-09-09).
      { source: "/builds/rhino-rock", destination: "/builds/rock-rhino", permanent: true },
    ];
  },
};

export default nextConfig;
