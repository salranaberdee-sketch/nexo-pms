import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Strip LINE's openExternalBrowser param after LINE hands off to system browser.
  // Uses `missing` to only match when the param IS present (prevents redirect loop).
  // The client-side cleanup in InstallPrompt.tsx is a belt-and-suspenders fallback.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "query", key: "openExternalBrowser" }],
        // Explicit destination without the param — Next.js drops unmatched query keys
        destination: "/:path*",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Service worker must not be cached and needs correct Content-Type
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
