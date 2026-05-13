import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /images, /favicon.ico, etc. (static files)
  matcher: ['/', '/(zh|en|ja)/:path*', '/(sitemap|api|privacy|terms|contact)'],
};
