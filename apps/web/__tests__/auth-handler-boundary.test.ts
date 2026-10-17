import { betterAuth } from 'better-auth';
import { describe, expect, it } from 'vitest';
import { resolveAuthPolicy } from '../lib/auth-policy';

// No database, provider, HTTP listener or real account is involved.
const auth = betterAuth({
  ...resolveAuthPolicy({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'synthetic-test-secret-not-a-real-key-12345' }),
  secret: 'synthetic-test-secret-not-a-real-key-12345',
  logger: { disabled: true },
});
describe('locked Better Auth request boundary without a provider', () => {
  it('rejects a foreign origin on a cookie-bearing sign-out', async () => {
    const response = await auth.handler(new Request('https://gachia.com/api/auth/sign-out', {
      method: 'POST', headers: { origin: 'https://evil.test', cookie: 'synthetic=1', 'content-type': 'application/json' }, body: '{}',
    }));
    expect(response.status).toBe(403);
  });
  it('rejects an external callback before provider execution', async () => {
    const response = await auth.handler(new Request('https://gachia.com/api/auth/sign-in/social', {
      method: 'POST', headers: { origin: 'https://gachia.com', 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'google', callbackURL: 'https://evil.test/steal' }),
    }));
    expect(response.status).toBe(403);
  });
  it('returns no session for an anonymous request', async () => {
    const response = await auth.handler(new Request('https://gachia.com/api/auth/get-session'));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});
