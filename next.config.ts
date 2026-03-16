import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "cdn.sportsdata.io" },
    ],
  },
  turbopack: {},
};

export default nextConfig;
