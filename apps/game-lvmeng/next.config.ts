import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix: '/_games/lvmeng',
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  async rewrites() {
    return [{ source: '/_games/lvmeng/_next/:path*', destination: '/_next/:path*' }];
  },
};

export default nextConfig;
