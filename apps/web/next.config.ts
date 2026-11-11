import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  async headers() {
    const privateApiHeaders = [
      { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      { key: 'Vary', value: 'Cookie, Authorization' },
    ];

    return [
      { source: '/api/auth/:path*', headers: privateApiHeaders },
      { source: '/api/indexnow/:path*', headers: privateApiHeaders },
      { source: '/api/favorites/:path*', headers: privateApiHeaders },
      { source: '/api/user-characters/:path*', headers: privateApiHeaders },
      { source: '/api/map/progress/:path*', headers: privateApiHeaders },
    ];
  },
  webpack: (config) => {
    // The content-heavy data and copy modules produce large serialized strings in the webpack cache.
    // Disabling the disk cache keeps CI/build output quiet and avoids the repeated warning noise.
    config.cache = false;
    return config;
  },
  images: {
    // CRITICAL: Use unoptimized for Cloudflare Workers compatibility
    // Cloudflare Workers doesn't support Sharp-based image optimization
    // Set unoptimized: true to avoid Error 1101 from image optimization failures
    unoptimized: true,
  },
  trailingSlash: false,
  outputFileTracingRoot: join(__dirname, '../..'),
  outputFileTracingExcludes: {
    '*': [
      '../../packages/data/games/**/raw-*.json',
      // Compatibility readers use ASSETS; these must not become server filesystem fallbacks.
      './public/data/genshin/**',
      './public/data-client/genshin-platform.json',
      './public/data-client/tier-list-genshin.json',
    ],
  },
  transpilePackages: ['react-leaflet', '@react-leaflet/core', 'react-leaflet-cluster'],
};

export default withNextIntl(nextConfig);
