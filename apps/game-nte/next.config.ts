import type { NextConfig } from 'next';

const isPreview = process.env.NTE_DEPLOYMENT_MODE !== 'live';

const nextConfig: NextConfig = {
  assetPrefix: '/_games/nte',
  images: { unoptimized: true },
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  async rewrites() {
    return {
      beforeFiles: [
        // The standalone preview URL has no Router Worker in front of it.
        // Keep the production namespace intact while making the preview root usable.
        { source: '/', destination: '/zh/nte' },
        { source: '/_games/nte/_next/:path*', destination: '/_next/:path*' },
      ],
    };
  },
  async headers() {
    const headers = [
      { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
    ];

    if (isPreview) headers.unshift({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });

    return [
      {
        source: '/(.*)',
        headers,
      },
    ];
  },
};

export default nextConfig;
