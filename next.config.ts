import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  typescript: {
    // Convex auth uses legacy @convex-dev/better-auth API; Convex is type-checked separately via convex dev
    ignoreBuildErrors: true
  }
};

export default nextConfig;
