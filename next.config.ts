import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE_URL: "/api", // Frontend will call `/api/xyz`
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:3001/:path*", // Docker-internal backend
      },
    ];
  },
};

export default nextConfig;
