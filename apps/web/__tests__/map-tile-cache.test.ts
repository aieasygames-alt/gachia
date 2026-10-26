import { createHash } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getR2: vi.fn(), get: vi.fn(), put: vi.fn(), waitUntil: vi.fn() }));
vi.mock('@/lib/db', () => ({ getR2: mocks.getR2 }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ({ ctx: { waitUntil: mocks.waitUntil } }) }));
import { GET } from '../app/api/map/tile/route';

const base = 'https://act-webstatic.hoyoverse.com/map_manage/20261025/';
const objects = new Map<string, ArrayBuffer>();
const request = (url: string, mapId = '2') => new Request(`https://gachia.com/api/map/tile?${new URLSearchParams({ url, map_id: mapId })}`);
const keyFor = (url: string, mapId = '2') => `map-tiles/v2/${mapId}/${createHash('sha256').update(new URL(url).href).digest('hex')}`;

beforeEach(() => {
  vi.resetAllMocks();
  objects.clear();
  mocks.getR2.mockReturnValue({ get: mocks.get, put: mocks.put });
  mocks.get.mockImplementation(async (key: string) => objects.has(key) ? { body: objects.get(key)!.slice(0) } : null);
  mocks.put.mockImplementation(async (key: string, body: ArrayBuffer) => { objects.set(key, body.slice(0)); });
  vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
    const body = new TextEncoder().encode(url.href);
    return new Response(body, { headers: { 'content-type': 'image/png', 'content-length': String(body.byteLength) } });
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.unstubAllGlobals());

it('separates the known 32-bit collision and returns the correct bytes on repeat hits', async () => {
  const urls = [`${base}Aa.png`, `${base}BB.png`];
  for (const expectedCache of ['MISS', 'HIT']) {
    for (const url of urls) {
      const response = await GET(request(url));
      expect(response.headers.get('x-cache')).toBe(expectedCache);
      expect(await response.text()).toBe(url);
    }
  }
  expect(fetch).toHaveBeenCalledTimes(2);
  expect([...objects.keys()]).toEqual(urls.map(url => keyFor(url)));
  expect(mocks.waitUntil).toHaveBeenCalledTimes(2);
  expect(mocks.put).toHaveBeenCalledWith(keyFor(urls[0]!), expect.any(ArrayBuffer), { httpMetadata: { contentType: 'image/png' } });
});

it('ignores old weak-hash objects without deleting or overwriting them', async () => {
  const oldKey = 'map-tiles/2/4zj5jb';
  const oldBody = new TextEncoder().encode('old collision bytes').buffer;
  objects.set(oldKey, oldBody);
  const url = `${base}BB.png`;
  const response = await GET(request(url));
  expect(response.headers.get('x-cache')).toBe('MISS');
  expect(await response.text()).toBe(url);
  expect(mocks.get).toHaveBeenCalledWith(keyFor(url));
  expect(mocks.get).not.toHaveBeenCalledWith(oldKey);
  expect(objects.get(oldKey)).toBe(oldBody);
  expect(objects.size).toBe(2);
});

it('uses the normalized fetch URL as identity, retaining map ID isolation', async () => {
  const url = `${base}Aa.png`;
  const alias = url.replace('act-webstatic.hoyoverse.com', 'ACT-WEBSTATIC.HOYOVERSE.COM:443');
  await GET(request(url));
  expect((await GET(request(alias))).headers.get('x-cache')).toBe('HIT');
  expect((await GET(request(url, '3'))).headers.get('x-cache')).toBe('MISS');
  expect([...objects.keys()]).toEqual([keyFor(url), keyFor(url, '3')]);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each([
  ['not a URL', '2', 400],
  [`${base}Aa.png`, '../2', 400],
  ['https://example.com/map_manage/20261025/Aa.png', '2', 403],
  [base.replace('https:', 'http:') + 'Aa.png', '2', 403],
  [`${base}Aa.png?x=1`, '2', 403],
  [`${base}Aa.png#x`, '2', 403],
  [`${base}Aa.jpg`, '2', 403],
])('rejects invalid request %s before storage or fetch', async (url, mapId, status) => {
  expect((await GET(request(url, mapId))).status).toBe(status);
  expect(mocks.getR2).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it.each(['binding', 'read'])('keeps upstream fallback when R2 %s fails', async failure => {
  if (failure === 'binding') mocks.getR2.mockImplementation(() => { throw new Error('Unavailable'); });
  else mocks.get.mockRejectedValue(new Error('Unavailable'));
  const response = await GET(request(`${base}Aa.png`));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(mocks.put).not.toHaveBeenCalled();
});

it('handles background write failure without losing the upstream response', async () => {
  mocks.put.mockRejectedValue(new Error('Write failed'));
  expect((await GET(request(`${base}Aa.png`))).status).toBe(200);
  await expect(mocks.waitUntil.mock.calls[0]![0]).resolves.toBeUndefined();
});

it('does not cache invalid upstream content', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('bad', { headers: { 'content-type': 'text/html', 'content-length': '3' } }));
  expect((await GET(request(`${base}Aa.png`))).status).toBe(502);
  expect(mocks.put).not.toHaveBeenCalled();
});
