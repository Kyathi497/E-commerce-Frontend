import type { NextConfig } from "next";

// The backend's API gateway. Read when the app is built, so set it at build time.
const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The browser only ever talks to this site: /api/v1/* is proxied to the
  // gateway, so the auth cookies stay first-party. Product photos (/media/*)
  // come through the gateway too, from catalog-service's media folder.
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${GATEWAY_URL}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${GATEWAY_URL}/media/:path*` },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
