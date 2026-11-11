import { describe, expect, it, vi } from 'vitest';
import contract from '../../../packages/core/genshin-content.json';
import router from './index';

const VERSION = 'a'.repeat(64);
const dataset = (name = 'new') => ({ characters: [{ id: 'example', name, nameAlt: 'Example' }], weapons: [], items: [], artifacts: [] });
const envelope = (data: unknown) => ({ schemaVersion: 1, owner: 'genshin', version: VERSION, data });
const platform = () => envelope({ characters: [{ id: 'example', name: { zh: 'New', en: 'New', ja: 'New' },
  imageUrl: 'https://img.gachia.com/images/genshin/characters/example.webp', imageAlt: 'Example', element: 'pyro', rarity: 5 }], guides: [], codes: [] });
type Call = { path: string; method: string; headers: Headers; search: string };
function fixture(overrides: Record<string, Response | Error> = {}) {
  const gameCalls: Call[] = [], mainCalls: Call[] = [];
  const gameFiles: Record<string, unknown> = {
    'games.json': envelope({ characters: ['example', 'new-character'] }),
    'tier-list.json': envelope([{ id: 'example', name: 'new', rarity: 5 }]),
    'platform.json': platform(),
    ...Object.fromEntries(contract.locales.map(locale => [`search-${locale}.json`, envelope(dataset())])),
    ...Object.fromEntries(contract.rawFiles.map(file => [`data/${file}`, [{ id: 'example', name: 'new' }]])),
  };
  const mainFiles: Record<string, unknown> = {
    '/data-manifest/games.json': { version: 1, games: { genshin: { characters: ['old'] }, nte: { characters: ['nte-character'] } } },
    ...Object.fromEntries(contract.locales.map(locale => [`/data-manifest/search-${locale}.json`, { genshin: dataset('old'), nte: dataset('nte') }])),
  };
  const site = (owner: string, calls: Call[], files: Record<string, unknown>, prefix = '') => ({
    fetch: async (request: Request) => {
      const url = new URL(request.url);
      calls.push({ path: url.pathname, method: request.method, headers: request.headers, search: url.search });
      const override = overrides[`${owner}:${url.pathname}`];
      if (override instanceof Error) throw override;
      if (override) return override.clone();
      const data = files[url.pathname.slice(prefix.length)];
      return data ? Response.json(data) : new Response(owner, { status: 404 });
    },
    connect: () => { throw new Error('not used'); },
  }) as Fetcher;
  const env = { MAIN_SITE: site('main', mainCalls, mainFiles), GENSHIN_SITE: site('genshin', gameCalls, gameFiles, `${contract.prefix}/`),
    GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true', GENSHIN_CONTENT_ENABLED: 'true' };
  return { env, gameCalls, mainCalls };
}
const request = (path: string, init?: RequestInit) => new Request(`https://gachia.com${path}`, init);

describe('Genshin content ownership compatibility', () => {
  for (const flag of [undefined, 'false', 'TRUE', '1']) it(`keeps legacy behavior when content opt-in is ${flag}`, async () => {
    const f = fixture();
    const result = await router.fetch(request('/data-manifest/search-zh.json'), { ...f.env, GENSHIN_CONTENT_ENABLED: flag });
    expect((await result.json() as { genshin: unknown }).genshin).toEqual(dataset('old'));
    expect(f.gameCalls).toHaveLength(0);
  });

  for (const file of contract.rawFiles) it(`routes legacy ${file} to game assets only`, async () => {
    const f = fixture(), response = await router.fetch(request(`/data/genshin/${file}`), f.env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'example', name: 'new' }]);
    expect(f.gameCalls[0]?.path).toBe(`${contract.prefix}/data/${file}`);
    expect(f.mainCalls).toHaveLength(0);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  for (const locale of contract.locales) it(`merges the ${locale} search fragment without changing other owners`, async () => {
    const f = fixture(), response = await router.fetch(request(`/data-manifest/search-${locale}.json`), f.env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ genshin: dataset(), nte: dataset('nte') });
    expect(response.headers.get('x-gachia-content-version')).toBe(VERSION);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('replaces the game manifest slice while keeping its public schema', async () => {
    const f = fixture(), response = await router.fetch(request('/data-manifest/games.json'), f.env);
    expect(await response.json()).toEqual({ version: 1, games: { genshin: { characters: ['example', 'new-character'] }, nte: { characters: ['nte-character'] } } });
  });

  it('unwraps the tier-list fragment for existing clients', async () => {
    const f = fixture(), response = await router.fetch(request('/data-client/tier-list-genshin.json'), f.env);
    expect(await response.json()).toEqual([{ id: 'example', name: 'new', rarity: 5 }]);
    expect(f.mainCalls).toHaveLength(0);
  });

  for (const method of ['GET', 'HEAD']) it(`routes the ${method} platform compatibility URL to its owner envelope`, async () => {
    const f = fixture(), response = await router.fetch(request('/data-client/genshin-platform.json', { method }), f.env);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-gachia-content-version')).toBe(VERSION);
    if (method === 'GET') expect(await response.json()).toEqual(platform());
    else expect(await response.text()).toBe('');
    expect(f.mainCalls).toHaveLength(0);
    expect(f.gameCalls[0]?.path).toBe(`${contract.prefix}/platform.json`);
  });

  for (const data of [null, {}, { characters: [{ id: 'no-name' }], guides: [], codes: [] }]) it(`rejects invalid platform content ${JSON.stringify(data)}`, async () => {
    const f = fixture({ [`genshin:${contract.prefix}/platform.json`]: Response.json(envelope(data)) });
    const response = await router.fetch(request('/data-client/genshin-platform.json'), f.env);
    expect(response.status).toBe(503);
    expect(f.mainCalls).toHaveLength(0);
  });

  for (const path of ['/data/genshin/raw-private.json', '/data/genshin/nested/raw-characters.json', '/data/genshin/raw-characters.json/']) {
    it(`does not fall back to a stale Main file: ${path}`, async () => {
      const f = fixture(), response = await router.fetch(request(path), f.env);
      expect(response.status).toBe(404);
      expect(f.mainCalls).toHaveLength(0);
      expect(f.gameCalls).toHaveLength(0);
    });
  }

  for (const path of ['/data/nte/raw-characters.json', '/data/genshin-other/raw-characters.json', '/data-client/tier-list-wuwa.json', '/data-manifest/search-fr.json', '/api/map/points']) {
    it(`does not capture unrelated paths: ${path}`, async () => {
      const f = fixture();
      await router.fetch(request(path), f.env);
      expect(f.gameCalls).toHaveLength(0);
      expect(f.mainCalls[0]?.path).toBe(path);
    });
  }

  it('does not forward credentials, conditional headers or caller queries to public reads', async () => {
    const f = fixture(), response = await router.fetch(request('/data-manifest/search-zh.json?private=secret', { headers: {
      cookie: 'session=secret', authorization: 'Bearer secret', 'if-none-match': 'old', range: 'bytes=0-10', 'x-gachia-route-debug': '1',
    } }), f.env);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-gachia-route-target')).toBe('genshin-content');
    expect(response.headers.has('set-cookie')).toBe(false);
    for (const call of [...f.gameCalls, ...f.mainCalls]) {
      expect([...call.headers]).toEqual([['accept', 'application/json']]);
      expect(call.search).toBe('');
      expect(call.method).toBe('GET');
    }
  });

  it('HEAD validates the same payload without returning a body', async () => {
    const f = fixture(), response = await router.fetch(request('/data-manifest/search-zh.json', { method: 'HEAD' }), f.env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(response.headers.get('x-gachia-content-version')).toBe(VERSION);
  });

  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) it(`rejects ${method} without invoking either Worker`, async () => {
    const f = fixture(), response = await router.fetch(request('/data-manifest/search-zh.json', { method }), f.env);
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect(f.gameCalls).toHaveLength(0);
    expect(f.mainCalls).toHaveLength(0);
  });

  for (const state of ['missing-binding', 'disabled-game', 'canary-only']) it(`fails closed if the content switch is inconsistent: ${state}`, async () => {
    const f = fixture();
    const env = { ...f.env, GENSHIN_SITE: state === 'missing-binding' ? undefined : f.env.GENSHIN_SITE,
      GENSHIN_ENABLED: state === 'disabled-game' ? 'false' : 'true', GENSHIN_FULL_CUTOVER: state === 'canary-only' ? 'false' : 'true' };
    const response = await router.fetch(request('/data-manifest/search-zh.json'), env);
    expect(response.status).toBe(503);
    expect(f.mainCalls).toHaveLength(0);
    expect(f.gameCalls).toHaveLength(0);
  });

  const path = `${contract.prefix}/search-zh.json`;
  for (const [name, response] of Object.entries({
    missing: new Response('', { status: 404 }), redirect: new Response('', { status: 302, headers: { location: '/login' } }),
    html: new Response('<html/>', { headers: { 'content-type': 'text/html' } }),
    cookie: Response.json(envelope(dataset()), { headers: { 'set-cookie': 'secret=1' } }),
    invalidJSON: new Response('{bad', { headers: { 'content-type': 'application/json' } }),
    wrongOwner: Response.json({ ...envelope(dataset()), owner: 'nte' }), wrongVersion: Response.json({ ...envelope(dataset()), version: 'unbound' }),
    wrongSchema: Response.json({ ...envelope(dataset()), schemaVersion: 2 }), badDataset: Response.json(envelope({ characters: [{ id: 'no-name' }] })),
    missingDataset: Response.json(envelope(null)), wrongCategory: Response.json(envelope({ arbitrary: [] })),
    oversizedHeader: new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': String(5 * 1024 * 1024) } }),
    oversizedBody: new Response(' '.repeat(4 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } }),
  })) it(`rejects ${name} game responses instead of showing the old Main slice`, async () => {
    const f = fixture({ [`genshin:${path}`]: response }), result = await router.fetch(request('/data-manifest/search-zh.json'), f.env);
    expect(result.status).toBe(503);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(f.mainCalls).toHaveLength(0);
  });

  for (const body of [null, [], {}, { genshin: { characters: 'broken' } }]) it(`rejects invalid Main search data: ${JSON.stringify(body)}`, async () => {
    const f = fixture({ 'main:/data-manifest/search-zh.json': Response.json(body) });
    expect((await router.fetch(request('/data-manifest/search-zh.json'), f.env)).status).toBe(503);
  });

  it('does not leak upstream exception details', async () => {
    const f = fixture({ [`genshin:${path}`]: new Error('private-token=secret') });
    const result = await router.fetch(request('/data-manifest/search-zh.json'), f.env);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('secret');
  });

  it('bounds streaming body reads even when the upstream ignores Request.signal', async () => {
    vi.useFakeTimers();
    try {
      const f = fixture({ [`genshin:${path}`]: new Response(new ReadableStream<Uint8Array>(), { headers: { 'content-type': 'application/json' } }) });
      const pending = router.fetch(request('/data-manifest/search-zh.json'), f.env);
      await vi.advanceTimersByTimeAsync(5001);
      expect((await pending).status).toBe(503);
      expect(f.mainCalls).toHaveLength(0);
    } finally { vi.useRealTimers(); }
  });

  for (const [path, body] of [
    [`${contract.prefix}/games.json`, envelope({ characters: 'invalid' })],
    [`${contract.prefix}/tier-list.json`, envelope([{ name: 'missing-id' }])],
    [`${contract.prefix}/data/raw-characters.json`, { not: 'an array' }],
  ] as const) it(`rejects malformed compatibility data: ${path}`, async () => {
    const f = fixture({ [`genshin:${path}`]: Response.json(body) });
    const target = path.endsWith('/games.json') ? '/data-manifest/games.json'
      : path.endsWith('/tier-list.json') ? '/data-client/tier-list-genshin.json' : '/data/genshin/raw-characters.json';
    expect((await router.fetch(request(target), f.env)).status).toBe(503);
    expect(f.mainCalls).toHaveLength(0);
  });
});
