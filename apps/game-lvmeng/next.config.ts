import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix: '/_games/lvmeng',
  async rewrites() {
    return [{ source: '/_games/lvmeng/_next/:path*', destination: '/_next/:path*' }];
  },
};

export default nextConfig;
