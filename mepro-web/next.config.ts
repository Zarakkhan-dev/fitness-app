import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The app is a fully client-driven shell against the MEPro API: session state
   * lives in localStorage and every screen is dynamic, so there is no server
   * payload worth prerendering. Turning cache components off keeps route
   * rendering predictable for data fetched on the client.
   */
  cacheComponents: false,
  reactStrictMode: true,
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
