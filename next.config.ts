import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'uploadthing', 'playwright', 'playwright-core'],
  turbopack: {
    // Turbopack configuration for Next.js 16
  },
};

export default nextConfig;
