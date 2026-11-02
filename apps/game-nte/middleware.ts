import { NextRequest, NextResponse } from 'next/server';
import { isWorkerPreviewOrigin } from './lib/preview-origin';
import { shadowLocalEnabled } from '../../packages/core/shadow-local-gate';

// A production artifact must remain non-indexable on its direct Worker origins.
// Do not use a different build for staging: it would invalidate promotion evidence.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/shadow' || request.nextUrl.pathname.startsWith('/shadow/')) {
    const response = shadowLocalEnabled('nte', request.headers.get('host'))
      ? NextResponse.next() : new NextResponse('Not found', { status: 404 });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  if (!isWorkerPreviewOrigin(request.nextUrl.origin)) return NextResponse.next();
  const response = request.nextUrl.pathname === '/robots.txt'
    ? new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    : NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = { matcher: ['/((?!_next/|_games/|images/|favicon.ico).*)'] };
