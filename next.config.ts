import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.0.23'],

  // SWC is enabled by default in Next.js 15+ - no configuration needed

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,

    // Additional compiler options for Next.js 15
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  images: {
    unoptimized: true,
    remotePatterns: [], // Modern alternative to domains
  },

  // Security and performance
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,

  // Next.js 15+ turbopack (replaces webpack in development)
  turbopack: {
    // Turbopack specific optimizations
    resolveAlias: {
      // Configure aliases if needed
    },
  },

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@mui/icons-material'],
  },

  // Keep webpack config for production builds
  webpack: (config, { isServer, nextRuntime }) => {
    // Optimize bundle size
    if (!isServer && nextRuntime !== 'edge') {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate common chunks
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
