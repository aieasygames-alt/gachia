import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    // CRITICAL FIX: Remove unoptimized to enable image optimization
    // Note: Cloudflare Workers doesn't support Sharp, but we can use external optimization
    unoptimized: false,
    // Configure image formats for optimization
    formats: ['image/avif', 'image/webp'],
    // Responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // For Cloudflare Workers compatibility
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  trailingSlash: false,
  outputFileTracingRoot: join(__dirname, '../..'),
  serverExternalPackages: ['react-markdown', 'remark-gfm', 'unified', 'vfile', 'remark-parse', 'remark-rehype'],
  transpilePackages: ['react-leaflet', '@react-leaflet/core', 'react-leaflet-cluster'],
};

export default withNextIntl(nextConfig);
