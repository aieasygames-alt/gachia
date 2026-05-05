import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  outputFileTracingRoot: join(__dirname, '../..'),
  serverExternalPackages: ['react-markdown', 'remark-gfm', 'unified', 'vfile', 'remark-parse', 'remark-rehype'],
};

export default withNextIntl(nextConfig);
