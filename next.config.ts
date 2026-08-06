import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'uploadthing'],
  turbopack: {
    // Turbopack configuration for Next.js 16
  },
};

export default nextConfig;
