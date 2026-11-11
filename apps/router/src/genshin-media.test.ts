import { afterEach, expect, it, vi } from 'vitest';
import router from './index';

const path = '/images/genshin/characters/albedo.webp';
const bytes = Uint8Array.from(atob('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'), value => value.charCodeAt(0));
const image = () => new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/webp' } });
const request = (path: string, init?: RequestInit) => new Request(`https://gachia.com${path}`, init);

function fixture(reply: () => Response | Promise<Response> = image) {
  const main = vi.fn(async (_request: Request) => new Response('Main'));
  const game = vi.fn(async (_request: Request) => reply());
  const binding = (fetch: typeof main): Fetcher => ({ fetch, connect() { throw new Error('not used'); } });
  const env = { MAIN_SITE: binding(main), GENSHIN_SITE: binding(game), GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true', GENSHIN_MEDIA_ENABLED: 'true' };
  return { main, game, env };
}

afterEach(() => vi.useRealTimers());

it.each([path, '/images/og/genshin.webp', '/images/articles/genshin/0.webp'])('serves GET and HEAD for %s without a Main read', async path => {
  const f = fixture();
  for (const method of ['GET', 'HEAD']) {
    const response = await router.fetch(request(`${path}?v=2`, { method, headers: {
      'x-gachia-route-debug': '1', cookie: 'session=private', authorization: 'Bearer private', range: 'bytes=0-1', 'if-none-match': 'old',
    } }), f.env);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('content-length')).toBe(String(bytes.length));
    expect(response.headers.get('x-gachia-route-target')).toBe('genshin-media');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(method === 'GET' ? bytes : new Uint8Array());
    const forwarded = f.game.mock.lastCall![0];
    expect(forwarded.method).toBe('GET');
    expect(forwarded.url).toBe(`https://gachia.com${path}`);
    expect(forwarded.redirect).toBe('manual');
    expect([...forwarded.headers]).toEqual([['accept', 'image/webp']]);
  }
  expect(f.main).not.toHaveBeenCalled();
});

it.each(['/images/og/starrail.webp', '/images/articles/nte/0.webp', '/images/logo.webp',
  '/images/genshin/characters/albedo.png', '/images/genshin/characters/nested/albedo.webp', '/images/genshin/characters/%61lbedo.webp',
  '/images/articles/genshin/text.webp', '/images/og/genshin.webp/', '/api/map/progress'])('leaves %s on its original Main route', async path => {
  const f = fixture();
  expect(await (await router.fetch(request(path), f.env)).text()).toBe('Main');
  expect(f.game).not.toHaveBeenCalled();
});

it.each([undefined, 'false', 'TRUE'])('preserves Main responses with media flag %s', async flag => {
  const f = fixture(() => { throw new Error('owner unavailable'); });
  const req = request(`${path}?v=1`, { headers: { range: 'bytes=0-1' } });
  expect(await (await router.fetch(req, { ...f.env, GENSHIN_MEDIA_ENABLED: flag })).text()).toBe('Main');
  expect(f.main).toHaveBeenCalledWith(req);
  expect(f.game).not.toHaveBeenCalled();
});

it.each(['POST', 'PUT', 'DELETE', 'OPTIONS'])('rejects %s before forwarding', async method => {
  const f = fixture();
  const result = await router.fetch(request(path, { method }), { ...f.env, GENSHIN_SITE: undefined });
  expect(result.status).toBe(405);
  expect(result.headers.get('allow')).toBe('GET, HEAD');
  expect(f.main).not.toHaveBeenCalled(); expect(f.game).not.toHaveBeenCalled();
});

it.each([{ GENSHIN_SITE: undefined }, { GENSHIN_ENABLED: 'false' }, { GENSHIN_FULL_CUTOVER: 'false' }])('fails closed for inconsistent configuration %j', async overrides => {
  const f = fixture();
  const response = await router.fetch(request(path), { ...f.env, ...overrides });
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(f.main).not.toHaveBeenCalled(); expect(f.game).not.toHaveBeenCalled();
});

it('returns 404 on an owner miss without falling back to a stale Main image', async () => {
  const f = fixture(() => new Response('owner error page', { status: 404, headers: { 'cache-control': 'public' } }));
  const response = await router.fetch(request(path), f.env);
  expect(response.status).toBe(404);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.text()).toBe('');
  expect(f.main).not.toHaveBeenCalled();
});

const invalid = [
  ['unavailable', () => new Response(null, { status: 503 })],
  ['redirect', () => new Response(null, { status: 302, headers: { location: 'https://example.com' } })],
  ['wrong type', () => new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/png' } })],
  ['cookie', () => { const result = image(); result.headers.set('set-cookie', 'private=1'); return result; }],
  ['cookie on miss', () => new Response(null, { status: 404, headers: { 'set-cookie': 'private=1' } })],
  ['wrong signature', () => new Response('not an image', { headers: { 'content-type': 'image/webp' } })],
  ['truncated', () => new Response(new Uint8Array(bytes.subarray(0, 30)), { headers: { 'content-type': 'image/webp' } })],
  ['length mismatch', () => { const result = image(); result.headers.set('content-length', '20'); return result; }],
  ['oversized', () => new Response(new Uint8Array(512 * 1024 + 1), { headers: { 'content-type': 'image/webp' } })],
  ['exception', () => { throw new Error('internal error'); }],
] as const;

it.each(invalid)('rejects %s without a Main read', async (_name, reply) => {
  const f = fixture(reply);
  const response = await router.fetch(request(path), f.env);
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.has('set-cookie')).toBe(false);
  expect(response.headers.has('location')).toBe(false);
  expect(f.main).not.toHaveBeenCalled();
});

it('bounds both the owner call and the response body', async () => {
  vi.useFakeTimers();
  for (const reply of [() => new Promise<Response>(() => {}),
    () => new Response(new ReadableStream(), { headers: { 'content-type': 'image/webp' } })]) {
    const f = fixture(reply), pending = router.fetch(request(path), f.env);
    await vi.advanceTimersByTimeAsync(5001);
    expect((await pending).status).toBe(503);
    expect(f.main).not.toHaveBeenCalled();
  }
});
