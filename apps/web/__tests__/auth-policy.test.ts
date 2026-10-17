import { describe, expect, it } from 'vitest';
import { resolveAuthPolicy } from '../lib/auth-policy';
const env = { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) };
describe('explicit auth configuration boundary', () => {
  it('does not trust a production request origin', () => {
    const policy = resolveAuthPolicy(env, 'https://evil.test');
    expect(policy.baseURL).toBe('https://gachia.com');
    expect(policy.trustedOrigins).toEqual(['https://gachia.com']);
    expect(policy.session).toEqual({ expiresIn: 604800, updateAge: 86400 });
  });
  it('supports explicitly configured staging without trusting production', () => {
    const origin = 'https://gachia-staging.aieasygames.workers.dev';
    expect(resolveAuthPolicy({ ...env, BETTER_AUTH_URL: origin }).trustedOrigins).toEqual([origin]);
  });
  it('fails closed on weak secrets and invalid base URLs', () => {
    expect(() => resolveAuthPolicy({ NODE_ENV: 'production' })).toThrow('BETTER_AUTH_SECRET');
    for (const BETTER_AUTH_URL of ['http://gachia.com', 'https://user:pass@gachia.com', 'https://gachia.com/path', 'https://gachia.com?x=1', 'https://gachia.com#x']) expect(() => resolveAuthPolicy({ ...env, BETTER_AUTH_URL })).toThrow();
  });
  it('retains local non-production origins', () => {
    expect(resolveAuthPolicy({ NODE_ENV: 'development' }, 'http://localhost:3000').baseURL).toBe('http://localhost:3000');
  });
});
