import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['zh', 'en', 'ja'];

// Paths that should be redirected with locale prefix
const LOCALE_PATHS = ['/sitemap', '/api', '/privacy', '/terms', '/contact'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/zh', request.url), 308);
  }

  // Redirect known pages without locale prefix
  if (LOCALE_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL(`/zh${pathname}`, request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/sitemap', '/api', '/privacy', '/terms', '/contact'],
};
