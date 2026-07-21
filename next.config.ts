import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows the build to complete even if TypeScript finds type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignores ESLint warnings/errors during builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
