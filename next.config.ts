import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: false
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
