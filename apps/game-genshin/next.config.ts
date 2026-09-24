import type { NextConfig } from 'next';

const isPreview = process.env.GENSHIN_DEPLOYMENT_MODE !== 'production';

const nextConfig: NextConfig = {
  assetPrefix: '/_games/genshin',
  images: { unoptimized: true },
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/zh/genshin' },
        { source: '/_games/genshin/_next/:path*', destination: '/_next/:path*' },
      ],
    };
  },
  async headers() {
    if (!isPreview) return [];

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
