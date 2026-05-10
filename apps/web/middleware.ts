import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['zh', 'en', 'ja'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/zh', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
