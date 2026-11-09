import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { PRIVATE_PATH_PREFIXES } from "./src/app/lib/privatePaths";

/**
 * Production: set NEXT_PUBLIC_API_BASE_URL to your deployed API (e.g. https://xxx.railway.app)
 * — no rewrites; the browser calls that origin directly.
 *
 * Local Docker Compose: NEXT_PUBLIC_API_BASE_URL=/api and API_PROXY_TARGET=http://backend:3001
 * so /api/* is proxied to the backend container.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const uploadSourceMaps = Boolean(sentryAuthToken);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The browser bundle cannot read VERCEL_ENV unless it is inlined here.
  ...(process.env.VERCEL_ENV ? { env: { VERCEL_ENV: process.env.VERCEL_ENV } } : {}),
  async headers() {
    const privateLink = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const noindexPaths = [...PRIVATE_PATH_PREFIXES, "/forgot-password"];
    return [
      { source: "/verify-email", headers: privateLink },
      { source: "/reset-password", headers: privateLink },
      ...noindexPaths.flatMap((path) => [
        { source: path, headers: noindex },
        { source: `${path}/:path*`, headers: noindex },
      ]),
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    disable: !uploadSourceMaps,
  },
  release: {
    create: uploadSourceMaps,
  },
  widenClientFileUpload: uploadSourceMaps,
});
