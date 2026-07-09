import { NextRequest } from 'next/server';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  const limited = await checkRateLimit(request, { limit: 20, windowSeconds: 60, prefix: '/api/auth' });
  if (limited) return limited;

  const auth = createAuth(request);
  return auth.handler(request);
}

export { handler as GET, handler as POST };
