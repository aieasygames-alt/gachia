import { NextRequest, NextResponse } from 'next/server';
import { isWorkerPreviewOrigin } from './lib/preview-origin';

// Protect direct and version-preview hosts without rebuilding the production artifact.
export function middleware(request: NextRequest) {
  if (!isWorkerPreviewOrigin(request.nextUrl.origin)) return NextResponse.next();
  const response = request.nextUrl.pathname === '/robots.txt'
    ? new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    : NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = { matcher: ['/((?!_next/|_games/|images/|favicon.ico).*)'] };
