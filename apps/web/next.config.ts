import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    // CRITICAL: Use unoptimized for Cloudflare Workers compatibility
    // Cloudflare Workers doesn't support Sharp-based image optimization
    // Set unoptimized: true to avoid Error 1101 from image optimization failures
    unoptimized: true,
  },
  trailingSlash: false,
  outputFileTracingRoot: join(__dirname, '../..'),
  transpilePackages: ['react-leaflet', '@react-leaflet/core', 'react-leaflet-cluster'],
};

export default withNextIntl(nextConfig);
