import { createAuth } from '@/lib/auth';

async function handler(request: Request) {
  const auth = createAuth();
  return auth.handler(request);
}

export { handler as GET, handler as POST };
