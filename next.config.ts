import type { NextConfig } from "next";

/**
 * Production: set NEXT_PUBLIC_API_BASE_URL to your deployed API (e.g. https://xxx.railway.app)
 * — no rewrites; the browser calls that origin directly.
 *
 * Local Docker Compose: NEXT_PUBLIC_API_BASE_URL=/api and API_PROXY_TARGET=http://backend:3001
 * so /api/* is proxied to the backend container.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  reactStrictMode: true,
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

export default nextConfig;
