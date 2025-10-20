import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
