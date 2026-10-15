import { describe, it, expect } from 'vitest';
import { useHi3Reading } from './hi3-reading-policy';
import router from './index';

const request = (path: string, init?: RequestInit) => new Request('https://preview.invalid' + path, init);
const enabled = { previewMode: 'true', enabled: 'true' };
const connect = (): never => { throw Error('connect not used'); };
const site = (body: string): Fetcher => ({ fetch: async () => new Response(body,
  { headers: { 'content-type': 'text/html' } }), connect });

describe('HI3 reading preview boundary', () => {
  it('allows exactly twelve paths, only explicit preview and public GET/HEAD', () => {
    for (const locale of ['zh', 'en', 'ja']) for (const suffix of ['', '/vermillion-liuli', '/vermillion-liuli-full-burn', '/volatile-sparkler']) {
      const path = `/${locale}/hi3/weapons${suffix}`;
      expect(useHi3Reading(request(path), enabled)).toBe(true);
      expect(useHi3Reading(request(path, { method: 'HEAD' }), enabled)).toBe(true);
      for (const settings of [{}, { enabled: 'true' }, { previewMode: 'true' }, { previewMode: 'false', enabled: 'true' }]) {
        expect(useHi3Reading(request(path), settings)).toBe(false);
      }
      const privateRequests: RequestInit[] = [{ method: 'POST' }, { headers: { cookie: '' } }, { headers: { authorization: 'Bearer test' } }];
      for (const init of privateRequests) {
        expect(useHi3Reading(request(path, init), enabled)).toBe(false);
      }
    }
  });

  it('preserves all non-reading paths and global resource ownership', () => {
    for (const path of ['/zh/hi3', '/en/hi3/characters', '/en/hi3/weapons/', '/en/hi3/weapons/unknown',
      '/en/hi3/weapons/vermillion-liuli/extra', '/en/hi3/weapons/%76ermillion-liuli', '/fr/hi3/weapons',
      '/api/auth/session', '/images/og/hi3.webp', '/_next/static/test.js', '/sitemap.xml', '/zh/zzz/weapons']) {
      expect(useHi3Reading(request(path), enabled)).toBe(false);
    }
  });

  it('forwards unchanged query and method; preview responses cannot be indexed or cached', async () => {
    let seen: Request | undefined;
    const reading = { fetch: async (input: Request) => { seen = input; return new Response('reading', {
      headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=3600' },
    }); } } as Fetcher;
    const input = request('/en/hi3/weapons?q=Full%20Burn', { headers: { 'x-gachia-route-debug': '1' } });
    const response = await router.fetch(input, { MAIN_SITE: site('main'), HI3_READING_SITE: reading,
      HI3_READING_ENABLED: 'true', PREVIEW_MODE: 'true' });
    expect(seen).toBe(input);
    expect(response.headers.get('x-gachia-route-target')).toBe('hi3-reading-preview');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('reading');
    const production = await router.fetch(input, { MAIN_SITE: site('main'), HI3_READING_SITE: reading,
      HI3_READING_ENABLED: 'true' });
    expect(await production.text()).toBe('main');
  });

  it('missing or failed selected binding yields 503 without silent main fallback', async () => {
    let mainCalls = 0;
    const main: Fetcher = { fetch: async () => { mainCalls++; return new Response('main'); }, connect };
    const broken: Fetcher = { fetch: async () => { throw Error('private failure'); }, connect };
    for (const binding of [undefined, broken]) {
      const response = await router.fetch(request('/zh/hi3/weapons'), { MAIN_SITE: main,
        HI3_READING_SITE: binding, HI3_READING_ENABLED: 'true', PREVIEW_MODE: 'true' });
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).not.toContain('private failure');
    }
    expect(mainCalls).toBe(0);
  });

  it('session traffic stays on main; selected downstream HTTP errors retain status', async () => {
    const env = { MAIN_SITE: site('main'), HI3_READING_SITE: site('reading'),
      HI3_READING_ENABLED: 'true', PREVIEW_MODE: 'true' };
    const sessionHeaders: Record<string, string>[] = [{ cookie: 'session=test' }, { authorization: 'Bearer test' }];
    for (const headers of sessionHeaders) {
      const response = await router.fetch(request('/en/hi3/weapons', { headers: new Headers(headers) }), env);
      expect(await response.text()).toBe('main');
    }
    const response = await router.fetch(request('/en/hi3/weapons?q=a&q=b'), {
      ...env, HI3_READING_SITE: { fetch: async () => new Response('bad query', { status: 400 }), connect },
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await response.text()).toBe('bad query');
  });
});
