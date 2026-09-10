import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix: '/_games/azur-promilia',
  images: { unoptimized: true },
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/zh/azur-promilia' },
        { source: '/_games/azur-promilia/_next/:path*', destination: '/_next/:path*' },
      ],
    };
  },
};

export default nextConfig;

