import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const GAME_IDS = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea'] as const;

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // P1-8: Redirect lang-less game URLs to user's preferred language (Accept-Language header)
  const firstSegment = pathname.split('/')[1];
  if (GAME_IDS.includes(firstSegment as typeof GAME_IDS[number])) {
    const acceptLanguage = request.headers.get('accept-language') || '';
    let preferredLang = 'en'; // Default to English

    if (acceptLanguage.includes('zh')) {
      preferredLang = 'zh';
    } else if (acceptLanguage.includes('ja')) {
      preferredLang = 'ja';
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLang}${pathname}`;
    return NextResponse.redirect(url, 301);
  }

  const response = intlMiddleware(request);

  // Override cache-control for public pages to allow Googlebot caching
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/images');
  if (!isStaticAsset) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    );
  }

  // CRITICAL FIX: Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Add Vary header for proper caching of multilingual content
  response.headers.set('Vary', 'Accept-Language');

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(zh|en|ja)/:path*',
    '/(sitemap|api|privacy|terms|contact)',
    '/(genshin|starrail|wuwa|nte|zzz|guihuan|ananta|endfield|sea)/:path*',
  ],
};
