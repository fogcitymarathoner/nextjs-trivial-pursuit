import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment
  allowedDevOrigins: ['192.168.0.23'],
};

export default nextConfig;