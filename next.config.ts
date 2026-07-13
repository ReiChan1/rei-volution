import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7's driver-adapter architecture (pg) needs to run as real
  // Node.js modules rather than get bundled by Turbopack.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
