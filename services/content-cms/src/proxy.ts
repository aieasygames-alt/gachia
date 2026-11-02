import { NextResponse, type NextRequest } from 'next/server'
import { desktopRequestAllowed } from './desktop-boundary'

export function proxy(request: NextRequest) {
  if (process.env.CMS_MODE === 'desktop' && !desktopRequestAllowed(request.headers)) {
    return new NextResponse('Local access only', { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.next()
}
