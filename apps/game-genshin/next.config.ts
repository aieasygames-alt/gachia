import type { NextConfig } from 'next';

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
};

export default nextConfig;
