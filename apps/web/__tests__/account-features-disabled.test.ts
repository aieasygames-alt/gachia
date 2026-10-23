import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ACCOUNT_FEATURES_ENABLED, accountFeatureUnavailable } from '../lib/site-features';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rate: vi.fn(), db: vi.fn(), d1: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/auth', () => ({ createAuth: mocks.auth }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate }));
vi.mock('@/lib/db', () => ({ getDb: mocks.db, getD1: mocks.d1 }));
vi.mock('better-auth/react', () => ({ createAuthClient: mocks.client }));

import * as auth from '../app/api/auth/[...all]/route';
import * as favorites from '../app/api/favorites/route';
import * as characters from '../app/api/user-characters/route';
import * as progress from '../app/api/map/progress/route';
import * as shared from '../app/api/shared-builds/route';
import { useSession, signIn, signOut } from '../lib/auth-client';

beforeEach(() => {
  for (const mock of [mocks.auth, mocks.rate, mocks.db, mocks.d1]) mock.mockClear();
});

describe('retired account boundary', () => {
  it('is explicitly disabled for this release', () => {
    expect(ACCOUNT_FEATURES_ENABLED).toBe(false);
    expect(accountFeatureUnavailable()?.status).toBe(404);
  });

  const routes = [
    ['/api/auth/get-session', 'GET', auth.GET], ['/api/auth/sign-in/social', 'POST', auth.POST],
    ['/api/auth/callback/google?code=old&state=old', 'GET', auth.GET], ['/api/auth/sign-out', 'POST', auth.POST],
    ...(['GET', 'POST', 'DELETE'] as const).map(method => ['/api/favorites', method, favorites[method]] as const),
    ...(['GET', 'POST', 'DELETE'] as const).map(method => ['/api/user-characters', method, characters[method]] as const),
    ...(['GET', 'POST', 'PUT'] as const).map(method => ['/api/map/progress', method, progress[method]] as const),
    ['/api/shared-builds', 'POST', shared.POST],
  ] as const;

  for (const [path, method, handler] of routes) for (const cookie of ['', '__Secure-better-auth.session_token=old-valid-or-invalid-session']) {
    it(`${method} ${path} stops before auth/rate limit/body/DB (${cookie ? 'old cookie' : 'anonymous'})`, async () => {
      const request = new NextRequest(`https://example.test${path}`, {
        method, headers: { cookie, 'content-type': 'application/json' },
        ...(method === 'GET' ? {} : { body: '{' }),
      });
      const parse = vi.spyOn(request, 'json');
      const response = await handler(request);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Account features are disabled', code: 'ACCOUNT_FEATURES_DISABLED' });
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toContain('noindex');
      expect(response.headers.get('set-cookie')).toBeNull();
      for (const fn of [mocks.auth, mocks.rate, mocks.db, mocks.d1, parse]) expect(fn).not.toHaveBeenCalled();
    });
  }

  it('keeps existing public shared-build reads available', async () => {
    const build = { id: 'existing', buildData: '{}' };
    const query = { from: vi.fn(), where: vi.fn(), limit: vi.fn().mockResolvedValue([build]) };
    query.from.mockReturnValue(query); query.where.mockReturnValue(query);
    mocks.db.mockReturnValue({ select: () => query });
    const response = await shared.GET(new NextRequest('https://example.test/api/shared-builds?id=existing'));
    expect(await response.json()).toEqual(build);
    expect(response.headers.get('cache-control')).toContain('public');
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.rate).not.toHaveBeenCalled();
  });

  it('does not initialize the browser auth client or fetch sessions', async () => {
    const network = vi.spyOn(globalThis, 'fetch');
    expect(useSession().data).toBeNull();
    expect(useSession().isPending).toBe(false);
    expect((await signIn.social({ provider: 'google' }))?.error?.message).toBe('Account features are disabled');
    expect((await signOut())?.error?.message).toBe('Account features are disabled');
    expect(mocks.client).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
});
