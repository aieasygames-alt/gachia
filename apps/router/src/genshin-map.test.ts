import { afterEach, expect, it, vi } from 'vitest';
import router from './index';

const tile = 'https://act-webstatic.hoyoverse.com/map_manage/20231214/map.png';
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const grid = { mapId: 2, name: 'Owner map', rows: 1, cols: 1, tileSize: 2048, totalWidth: 2048, totalHeight: 2048, tiles: [[tile]] };
const points = { mapId: 2, categories: [{ id: '3', name: 'Owner point', points: [{ id: 1, x: -1, y: 2.5 }] }], totalPoints: 1 };
const paths = ['/api/map', '/api/map/points?labels=3', `/api/map/tile?url=${encodeURIComponent(tile)}`];
const request = (path: string, init?: RequestInit) => new Request(`https://gachia.com${path}`, init);
function fixture(reply?: () => Promise<Response> | Response) {
  const main = vi.fn(async () => new Response('legacy main', { headers: { 'x-test-owner': 'main' } }));
  const game = vi.fn(async (request: Request) => reply ? reply() : new URL(request.url).pathname.endsWith('/tile')
    ? new Response(png, { headers: { 'content-type': 'image/png' } }) : Response.json(new URL(request.url).pathname.endsWith('/points') ? points : grid));
  const binding = (fetch: typeof main | typeof game) => ({ fetch, connect() { throw new Error('not used'); } }) as Fetcher;
  const env = { MAIN_SITE: binding(main), GENSHIN_SITE: binding(game), GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true', GENSHIN_MAP_ENABLED: 'true' };
  return { main, game, env };
}
afterEach(() => vi.useRealTimers());

for (const flag of [undefined, 'false', 'TRUE', '1']) it(`keeps all legacy map paths on Main when opt-in is ${flag}`, async () => {
  const f = fixture(); for (const path of paths) expect(await (await router.fetch(request(path), { ...f.env, GENSHIN_MAP_ENABLED: flag })).text()).toBe('legacy main');
  expect(f.game).not.toHaveBeenCalled(); expect(f.main).toHaveBeenCalledTimes(3);
});

for (const path of paths) for (const method of ['GET', 'HEAD']) it(`routes ${method} ${path} only to game`, async () => {
  const f = fixture(); const response = await router.fetch(request(path, { method, headers: { 'x-gachia-route-debug': '1' } }), f.env);
  expect(response.status).toBe(200); expect(response.headers.get('x-gachia-route-target')).toBe('genshin-map'); expect(f.main).not.toHaveBeenCalled();
  expect(f.game).toHaveBeenCalledTimes(1); expect(f.game.mock.calls[0]![0].method).toBe('GET');
  if (method === 'HEAD') expect(await response.text()).toBe('');
  else if (path.startsWith('/api/map/tile')) expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  else expect(await response.json()).toEqual(path.startsWith('/api/map/points') ? points : grid);
});

it('canonicalizes one trailing slash and forwards only endpoint-specific query parameters', async () => {
  const f = fixture(); await router.fetch(request('/api/map/points/?map_id=2&labels=3&private=secret&url=https://evil.test', { headers: {
    cookie: 'session=secret', authorization: 'Bearer secret', origin: 'https://evil.test', range: 'bytes=0-1', 'if-none-match': 'old', 'x-forwarded-host': 'evil.test',
  } }), f.env);
  const forwarded = f.game.mock.calls[0]![0]; expect(new URL(forwarded.url).pathname).toBe('/api/map/points');
  expect(new URL(forwarded.url).search).toBe('?map_id=2&labels=3'); expect([...forwarded.headers]).toEqual([['accept', 'application/json']]);
  expect(forwarded.redirect).toBe('manual'); expect(f.main).not.toHaveBeenCalled();
});

for (const path of ['/api/map/progress', '/api/map/progress?map_id=teyvat', '/api/map/points/private', '/api/map/tile/extra', '/api/maps', '/api/auth/get-session', '/api/favorites?gameId=genshin']) {
  for (const method of ['GET', 'POST', 'PUT']) it(`keeps player/unrelated ${method} ${path} on Main`, async () => {
    const f = fixture(); expect(await (await router.fetch(request(path, { method }), f.env)).text()).toBe('legacy main'); expect(f.game).not.toHaveBeenCalled();
  });
}

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) it(`does not forward public-map ${method}`, async () => {
  const f = fixture(); for (const path of paths) {
    const response = await router.fetch(request(path, { method }), f.env); expect(response.status).toBe(405); expect(response.headers.get('allow')).toBe('GET, HEAD');
  }
  expect(f.main).not.toHaveBeenCalled(); expect(f.game).not.toHaveBeenCalled();
});

for (const state of ['no-binding', 'disabled-game', 'canary-only']) it(`fails closed on inconsistent map opt-in: ${state}`, async () => {
  const f = fixture(); const env = { ...f.env, GENSHIN_SITE: state === 'no-binding' ? undefined : f.env.GENSHIN_SITE,
    GENSHIN_ENABLED: state === 'disabled-game' ? 'false' : 'true', GENSHIN_FULL_CUTOVER: state === 'canary-only' ? 'false' : 'true' };
  for (const path of paths) { const response = await router.fetch(request(path), env); expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toBe('no-store'); }
  expect(f.main).not.toHaveBeenCalled(); expect(f.game).not.toHaveBeenCalled();
});

for (const status of [400, 403, 405, 502, 503]) it(`preserves the owner's safe HTTP ${status} without Main fallback`, async () => {
  const f = fixture(() => Response.json({ error: 'Map error' }, { status, headers: { 'cache-control': 'public, max-age=9999' } }));
  const response = await router.fetch(request('/api/map'), f.env); expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('no-store'); expect(f.main).not.toHaveBeenCalled();
});

for (const [name, response] of Object.entries({
  redirect: new Response('', { status: 302, headers: { location: 'https://evil.test' } }), missing: new Response('', { status: 404 }),
  html: new Response('<html>', { headers: { 'content-type': 'text/html' } }), cookie: Response.json(grid, { headers: { 'set-cookie': 'private=1' } }),
  malformed: new Response('{bad', { headers: { 'content-type': 'application/json' } }), wrongMap: Response.json({ ...grid, mapId: 7 }), wrongShape: Response.json({}),
  badGrid: Response.json({ ...grid, rows: 2 }), oversizeHeader: Response.json(grid, { headers: { 'content-length': String(9 * 1024 * 1024) } }),
  oversizeBody: new Response(' '.repeat(8 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } }),
})) it(`rejects ${name} game response with no fallback`, async () => {
  const f = fixture(() => response.clone()); const result = await router.fetch(request('/api/map'), f.env);
  expect(result.status).toBe(503); expect(result.headers.get('cache-control')).toBe('no-store'); expect(f.main).not.toHaveBeenCalled();
});

it('rejects point count mismatches and invalid PNGs', async () => {
  const f = fixture(() => Response.json({ ...points, totalPoints: 0 })); expect((await router.fetch(request('/api/map/points'), f.env)).status).toBe(503);
  const tileFixture = fixture(() => new Response('not PNG', { headers: { 'content-type': 'image/png' } }));
  expect((await router.fetch(request(paths[2]!), tileFixture.env)).status).toBe(503);
});

it('bounds ignored service-binding signals and stalled bodies, and hides exception details', async () => {
  vi.useFakeTimers();
  for (const reply of [() => new Promise<Response>(() => {}), () => Promise.resolve(new Response(new ReadableStream(), { headers: { 'content-type': 'application/json' } }))]) {
    const f = fixture(reply), pending = router.fetch(request('/api/map'), f.env); await vi.advanceTimersByTimeAsync(12001);
    expect((await pending).status).toBe(503); expect(f.main).not.toHaveBeenCalled();
  }
  const f = fixture(() => { throw new Error('secret-token'); }); const response = await router.fetch(request('/api/map'), f.env);
  expect(response.status).toBe(503); expect(await response.text()).not.toContain('secret-token');
});
