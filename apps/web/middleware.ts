import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Override cache-control for public pages to allow Googlebot caching
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.startsWith('/images');
  if (!isStaticAsset) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    );
  }

  return response;
}

export const config = {
  matcher: ['/', '/(zh|en|ja)/:path*', '/(sitemap|api|privacy|terms|contact)'],
};
