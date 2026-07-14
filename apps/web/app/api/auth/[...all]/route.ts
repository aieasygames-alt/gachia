import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

function isUnavailableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('D1 database binding')
    || message.includes('Cloudflare environment bindings')
    || message.includes('GOOGLE_CLIENT_ID')
    || message.includes('GOOGLE_CLIENT_SECRET');
}

async function handler(request: NextRequest) {
  try {
    const limited = await checkRateLimit(request, { limit: 20, windowSeconds: 60, prefix: '/api/auth' });
    if (limited) return limited;

    const auth = createAuth(request);
    return auth.handler(request);
  } catch (error) {
    if (request.method === 'GET' && request.nextUrl.pathname.endsWith('/get-session') && isUnavailableAuthError(error)) {
      return NextResponse.json(null);
    }
    throw error;
  }
}

export { handler as GET, handler as POST };
