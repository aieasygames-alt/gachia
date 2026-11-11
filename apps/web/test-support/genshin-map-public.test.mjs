import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { GENSHIN_SUB_MAPS } from '@gachia/data/games/genshin/map-data';
import { mapTileURL, servePublicMap } from '../../game-genshin/lib/map-public';
import * as mapRoute from '../../game-genshin/app/api/map/route';
import * as pointsRoute from '../../game-genshin/app/api/map/points/route';
import * as tileRoute from '../../game-genshin/app/api/map/tile/route';
import { genshinMapPath, MAP_TILE_LIMIT, readMapBody, withMapDeadline } from '../../../packages/core/genshin-map';

const tile = 'https://act-webstatic.hoyoverse.com/map_manage/20231214/map_tile.png';
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
const source = (id = 2) => ({ retcode: 0, data: { info: { id, name: 'Actual owner map', detail: JSON.stringify({ slices: [[{ url: tile }, { url: '' }]] }) } } });
const sourcePoints = () => ({ retcode: 0, data: { label_list: [{ id: 3, name: 'Waypoint' }, { id: 18, name: 'Seelie' }, { id: 357, name: 'Lumenspar' }], point_list: [
  { id: 1, label_id: 3, x_pos: -123.5, y_pos: 7.25, author_name: 'must not expose' },
  { id: 2, label_id: 18, x_pos: 99, y_pos: -2 }, { id: 3, label_id: 357, x_pos: 0, y_pos: 0 }, { id: 4, label_id: 999, x_pos: 1, y_pos: 2 },
] } });
const request = (path, init) => new Request(`https://gachia.com${path}`, init);
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('exports real dynamic GET/HEAD and explicit read-only handlers for exactly three routes', () => {
  for (const route of [mapRoute, pointsRoute, tileRoute]) {
    expect(route.dynamic).toBe('force-dynamic');
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) expect(route[method]).toBe(servePublicMap);
  }
  for (const path of ['/api/map', '/api/map/points', '/api/map/tile']) { expect(genshinMapPath(path)).toBe(path); expect(genshinMapPath(path + '/')).toBe(path); }
  for (const path of ['/api/map/progress', '/api/map/points/private', '/api/maps', '/api/map//', '/api/auth/get-session']) expect(genshinMapPath(path)).toBeUndefined();
});

it('preserves the existing default label selection from the owner map source', () => {
  const legacy = readFileSync(new URL('../../web/app/api/map/points/route.ts', import.meta.url), 'utf8');
  const list = legacy.slice(legacy.indexOf('new Set([') + 9, legacy.indexOf(']);'));
  const ids = list.replace(/\/\/[^\n]*/g, '').match(/\d+/g).map(Number);
  expect([...new Set(GENSHIN_SUB_MAPS[0].labelIds)].sort((a, b) => a - b)).toEqual(ids.sort((a, b) => a - b));
});

for (const id of Array.from({ length: 9 }, (_, index) => index + 1)) it(`preserves metadata schema and coordinates for map ${id}`, async () => {
  const fetcher = vi.fn(async () => Response.json(source(id))); vi.stubGlobal('fetch', fetcher);
  const response = await mapRoute.GET(request(`/api/map?map_id=${id}`, { headers: { cookie: 'secret=1', authorization: 'Bearer private' } }));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('public, s-maxage=86400');
  expect(await response.json()).toEqual({ mapId: id, name: 'Actual owner map', rows: 1, cols: 2, tileSize: 2048, totalWidth: 4096, totalHeight: 2048, tiles: [[tile, '']] });
  const [url, init] = fetcher.mock.calls[0]; expect(String(url)).toBe(`https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/info?map_id=${id}&app_sn=ys_obc&lang=en-us`);
  expect(init.headers).toEqual({ accept: 'application/json' }); expect(init.redirect).toBe('manual'); expect(init.cache).toBe('no-store');
});

it('preserves public point IDs/coordinates, filters requested labels and strips source metadata', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(sourcePoints())));
  const defaults = await pointsRoute.GET(request('/api/map/points'));
  expect(defaults.status).toBe(200); expect(defaults.headers.get('cache-control')).toBe('public, s-maxage=21600');
  expect(await defaults.json()).toEqual({ mapId: 2, categories: [{ id: '3', name: 'Waypoint', points: [{ id: 1, x: -123.5, y: 7.25 }] }], totalPoints: 1 });
  for (const map of GENSHIN_SUB_MAPS) {
    const response = await pointsRoute.GET(request(`/api/map/points?map_id=${map.hoyolabMapId}&labels=${map.labelIds.join(',')}`));
    const value = await response.json(); expect(response.status).toBe(200); expect(value.mapId).toBe(map.hoyolabMapId);
    expect(value.categories.every(category => map.labelIds.includes(Number(category.id)))).toBe(true);
    expect(JSON.stringify(value)).not.toContain('must not expose');
  }
  const empty = await pointsRoute.GET(request('/api/map/points?labels=777')); expect(await empty.json()).toEqual({ mapId: 2, categories: [], totalPoints: 0 });
  const names = sourcePoints(); names.data.label_list[0].name = 'Owner B <script>literal</script>';
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(names)));
  expect((await (await pointsRoute.GET(request('/api/map/points'))).json()).categories[0].name).toBe(names.data.label_list[0].name);
});

it('supports bounded chunked PNGs without an R2 binding, credential forwarding or persistent writes', async () => {
  const fetcher = vi.fn(async () => new Response(png, { headers: { 'content-type': 'image/png' } })); vi.stubGlobal('fetch', fetcher);
  const response = await tileRoute.GET(request(`/api/map/tile?url=${encodeURIComponent(tile)}`));
  expect(response.status).toBe(200); expect(response.headers.get('x-cache')).toBe('BYPASS'); expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  expect(fetcher.mock.calls[0][1].headers).toEqual({ 'user-agent': 'Gachia/1.0', accept: 'image/png,image/jpeg' });
});

it.each(['.png', '.jpeg', '.jpg'])('accepts provider JPEG at an allowlisted %s URL without rewriting its MIME', async extension => {
  const jpeg = Uint8Array.from([255, 216, 255, 224, 1, 2]);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } })));
  const response = await tileRoute.GET(request(`/api/map/tile?url=${encodeURIComponent(tile.replace('.png', extension))}`));
  expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('image/jpeg'); expect(new Uint8Array(await response.arrayBuffer())).toEqual(jpeg);
});

it('stream-projects a source beyond 16 MiB without retaining unrequested rows or source metadata', async () => {
  const count = 80000, padding = 'ignored'.repeat(35);
  let next = 0;
  const stream = new ReadableStream({ pull(controller) {
    if (next === 0) controller.enqueue(new TextEncoder().encode('{"retcode":0,"data":{"point_list":['));
    if (next < count) {
      const rows = Array.from({ length: Math.min(500, count - next) }, (_, index) => ({ id: next + index, label_id: index === 0 ? 3 : 999, x_pos: -1, y_pos: 2.5, padding }));
      controller.enqueue(new TextEncoder().encode((next ? ',' : '') + rows.map(JSON.stringify).join(','))); next += rows.length;
    } else { controller.enqueue(new TextEncoder().encode('],"label_list":[{"id":3,"name":"Waypoint"}]}}')); controller.close(); }
  } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { headers: { 'content-type': 'application/json' } })));
  const response = await pointsRoute.GET(request('/api/map/points?labels=3')); expect(response.status).toBe(200);
  const value = await response.json(); expect(value.totalPoints).toBe(160); expect(value.categories[0].points).toHaveLength(160); expect(JSON.stringify(value)).not.toContain(padding);
});

it('handles every byte split including multibyte names, labels before points, and malformed stream endings', async () => {
  const payload = sourcePoints(); payload.data.label_list[0].name = '地图 <script>原文</script>';
  const bytes = new TextEncoder().encode(JSON.stringify({ data: { label_list: payload.data.label_list, point_list: payload.data.point_list }, retcode: 0 }));
  for (const size of [1, 2, 7, 127]) {
    let offset = 0;
    const body = new ReadableStream({ pull(controller) { if (offset >= bytes.length) controller.close(); else { controller.enqueue(bytes.slice(offset, offset + size)); offset += size; } } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { headers: { 'content-type': 'application/json' } })));
    const response = await pointsRoute.GET(request('/api/map/points?labels=3')); expect(response.status).toBe(200); expect((await response.json()).categories[0].name).toBe(payload.data.label_list[0].name);
  }
  for (const body of ['{"data":{"point_list":[],"label_list":[]}', '{"data":{"point_list":{},"label_list":[]}}', '{"data":{"point_list":[],"label_list":[]},"retcode":-1}', JSON.stringify(sourcePoints()) + '{}']) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { headers: { 'content-type': 'application/json' } })));
    expect((await pointsRoute.GET(request('/api/map/points'))).status).toBe(502);
  }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(Uint8Array.from([123, 34, 255, 34, 58, 48, 125]), { headers: { 'content-type': 'application/json' } })));
  expect((await pointsRoute.GET(request('/api/map/points'))).status).toBe(502);
});

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) it(`rejects ${method} without any outbound request`, async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const path of ['/api/map', '/api/map/points', '/api/map/tile']) {
    const response = await servePublicMap(request(path, { method }));
    expect(response.status).toBe(405); expect(response.headers.get('allow')).toBe('GET, HEAD'); expect(response.headers.get('cache-control')).toBe('no-store');
  }
  expect(fetcher).not.toHaveBeenCalled();
});

for (const path of ['/api/map?map_id=0', '/api/map?map_id=10', '/api/map?map_id=2%26private=1', '/api/map?map_id=2&map_id=7',
  '/api/map/points?labels=3,', '/api/map/points?labels=3&labels=5', '/api/map/points?labels=1000000', `/api/map/points?labels=${'1,'.repeat(101)}1`, '/api/map/tile']) {
  it(`rejects malformed parameters before fetch: ${path.slice(0, 80)}`, async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); const response = await servePublicMap(request(path));
    expect(response.status).toBe(400); expect(fetcher).not.toHaveBeenCalled(); expect(response.headers.get('cache-control')).toBe('no-store');
  });
}

for (const url of ['http://act-webstatic.hoyoverse.com/map_manage/20231214/map.png', tile + '?secret=1', tile + '#x', tile.replace('.com/', '.com:444/'),
  tile.replace('act-webstatic.', 'evil.'), tile.replace('https://', 'https://user:pass@'), 'https://127.0.0.1/a.png', tile.replace('.png', '.svg'), tile.replace('map_tile', '../map_tile')]) {
  it(`rejects unsafe tile URLs: ${url}`, async () => {
    expect(mapTileURL(url)).toBeUndefined(); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect((await tileRoute.GET(request(`/api/map/tile?url=${encodeURIComponent(url)}`))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
}

for (const [label, build] of Object.entries({
  redirect: () => new Response('', { status: 302, headers: { location: tile } }), error: () => new Response('', { status: 500 }),
  html: () => new Response('<html>', { headers: { 'content-type': 'text/html' } }), cookie: () => Response.json(source(), { headers: { 'set-cookie': 'private=1' } }),
  json: () => new Response('{bad', { headers: { 'content-type': 'application/json' } }), wrongMap: () => Response.json(source(7)), retcode: () => Response.json({ ...source(), retcode: -1 }),
  missing: () => Response.json({ data: {} }), badGrid: () => Response.json({ data: { info: { ...source().data.info, detail: '{"slices":[]}' } } }),
  unsafeGrid: () => Response.json({ data: { info: { ...source().data.info, detail: JSON.stringify({ slices: [[{ url: 'https://evil.test/a.png' }]] }) } } }),
  oversized: () => Response.json(source(), { headers: { 'content-length': String(17 * 1024 * 1024) } }),
})) it(`fails closed on ${label} upstream metadata`, async () => {
  vi.stubGlobal('fetch', vi.fn(async () => build())); const response = await mapRoute.GET(request('/api/map'));
  expect(response.status).toBe(502); expect(response.headers.get('cache-control')).toBe('no-store'); expect(await response.json()).toEqual({ error: 'Map source unavailable' });
});

it('rejects missing/invalid point payloads instead of pretending there are zero points', async () => {
  for (const payload of [{}, { point_list: [], label_list: null }, { ...sourcePoints().data, point_list: [{ id: 1, label_id: 3, x_pos: '1', y_pos: 2 }] }]) {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: payload })));
    expect((await pointsRoute.GET(request('/api/map/points'))).status).toBe(502);
  }
});

it('rejects wrong tile MIME/signature, redirect, bad length and streamed overflow', async () => {
  for (const response of [new Response(png, { headers: { 'content-type': 'image/jpeg' } }), new Response('not PNG', { headers: { 'content-type': 'image/png' } }),
    new Response('', { status: 302 }), new Response(png, { headers: { 'content-type': 'image/png', 'content-length': '-1' } }),
    new Response(new Uint8Array(MAP_TILE_LIMIT + 1), { headers: { 'content-type': 'image/png' } })]) {
    vi.stubGlobal('fetch', vi.fn(async () => response)); expect((await tileRoute.GET(request(`/api/map/tile?url=${encodeURIComponent(tile)}`))).status).toBe(502);
  }
});

it('HEAD performs the same validation and returns no body', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(source())));
  const response = await mapRoute.HEAD(request('/api/map', { method: 'HEAD' })); expect(response.status).toBe(200); expect(await response.text()).toBe('');
});

it('bounds both ignored fetch signals and stalled streaming bodies', async () => {
  vi.useFakeTimers();
  for (const fetcher of [() => new Promise(() => {}), async () => new Response(new ReadableStream(), { headers: { 'content-type': 'application/json' } })]) {
    vi.stubGlobal('fetch', vi.fn(fetcher)); const pending = servePublicMap(request('/api/map'));
    await vi.advanceTimersByTimeAsync(10001); expect((await pending).status).toBe(502);
  }
});

it('shared bounded reads reject corrupt length, overflow and abort without hanging', async () => {
  await expect(withMapDeadline(signal => readMapBody(new Response('12345'), 4, signal))).rejects.toThrow('exceeds');
  await expect(withMapDeadline(signal => readMapBody(new Response('1', { headers: { 'content-length': 'no' } }), 4, signal))).rejects.toThrow('length');
  const controller = new AbortController(); controller.abort(); await expect(readMapBody(new Response('1'), 4, controller.signal)).rejects.toThrow();
});
