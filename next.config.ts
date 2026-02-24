import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  reactStrictMode: true,
  cacheComponents: true,
  experimental: {
    serverActions: { bodySizeLimit: "512kb" },
  },
};

export default nextConfig;
