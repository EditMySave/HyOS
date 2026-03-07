import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build for Docker
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
