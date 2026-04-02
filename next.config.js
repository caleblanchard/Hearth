const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // We'll handle registration manually to have more control
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [
    /middleware-manifest\.json$/,
    /app-build-manifest\.json$/,
  ],
  runtimeCaching: [],
  // Ensure service worker files are included in the build
  sw: 'sw.js',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify removed - default in Next.js 16
  poweredByHeader: false,
  output: 'standalone', // For Docker deployment
  
  // Turbopack configuration
  // Note: next-pwa uses webpack, so we explicitly allow webpack in dev
  // and use Turbopack for production builds
  turbopack: {},
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Webpack config (for next-pwa compatibility)
  webpack: (config, { isServer }) => {
    // next-pwa uses webpack plugins
    return config;
  },
};

module.exports = withPWA(nextConfig);
