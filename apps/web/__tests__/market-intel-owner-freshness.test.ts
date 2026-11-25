import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getGenshinFreshnessGuides, readGenshinFreshnessGuides } from '@/lib/genshin-freshness-content';
import { GenshinContentUnavailableError } from '@/lib/genshin-content-reader';
import { getDashboardFreshnessFindings, freshnessGuideGames } from '@/lib/market-intel-freshness';
import { FRESHNESS_WATCH_TERMS, scanFreshnessGuides, type FreshnessGuide } from '@/lib/content-freshness';
import Page, { dynamic, generateMetadata } from '../app/[lang]/tools/market-intel/page';
import middleware from '../middleware';

const context = vi.hoisted(() => ({ get: vi.fn() }));
const other = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: context.get }));
vi.mock('@gachia/data/load-json', () => ({ loadJson: other.load }));
const snapshot = () => JSON.parse(readFileSync('public/data/genshin/raw-guides.json', 'utf8'));
const binding = (value: unknown) => ({ fetch: vi.fn(async (_request: Request) => Response.json(value)) });
const ownerEnv = (value: unknown) => ({ GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: binding(value) });
const originalRuleCount = FRESHNESS_WATCH_TERMS.length;
const render = async (lang = 'en') => renderToStaticMarkup(await Page({ params: Promise.resolve({ lang }) }));

beforeEach(() => {
  context.get.mockReset(); other.load.mockReset();
  other.load.mockImplementation(async (path: string) => JSON.parse(readFileSync(path, 'utf8')));
});
afterEach(() => { vi.useRealTimers(); FRESHNESS_WATCH_TERMS.splice(originalRuleCount); });

it('validates and projects the real existing owner guides without retaining unrelated fields', async () => {
  const value = snapshot(), result = await readGenshinFreshnessGuides(ownerEnv(value));
  expect(result.source).toBe('/_games/genshin/content/data/raw-guides.json');
  expect(result.guides).toHaveLength(value.length);
  expect(result.guides[0]).toMatchObject({ id: value[0].id, content: value[0].content, contentEn: value[0].contentEn });
  expect(result.guides[0]).not.toHaveProperty('faq');
  expect(result.guides[0]).not.toHaveProperty('tags');
});

it('requests only the dedicated binding with no Internet request, caller credentials or Main fallback', async () => {
  const env = ownerEnv(snapshot()), assets = binding([]), network = vi.spyOn(globalThis, 'fetch');
  context.get.mockReturnValue({ env: { ...env, ASSETS: assets } });
  try {
    await getGenshinFreshnessGuides();
    const request = env.GENSHIN_CONTENT.fetch.mock.calls[0]![0];
    expect(request.url).toBe('https://gachia.com/_games/genshin/content/data/raw-guides.json');
    expect(request.method).toBe('GET'); expect(request.redirect).toBe('manual');
    expect([...request.headers]).toEqual([['accept', 'application/json']]);
    expect(assets.fetch).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  } finally { network.mockRestore(); }
});

it.each([undefined, 'false', 'TRUE', '1'])('preserves only the explicit ASSETS compatibility path for %s', async flag => {
  const assets = binding(snapshot()), game = binding([]);
  const result = await readGenshinFreshnessGuides({ GENSHIN_CONTENT_ENABLED: flag, ASSETS: assets, GENSHIN_CONTENT: game });
  expect(result.source).toBe('/data/genshin/raw-guides.json');
  expect(assets.fetch.mock.calls[0]![0].url).toBe('https://gachia.com/data/genshin/raw-guides.json');
  expect(game.fetch).not.toHaveBeenCalled();
});

it.each(['missing', 'throwing', 'context'])('reports unavailable %s ownership without using old Main data', async fault => {
  const assets = binding(snapshot());
  const env = { GENSHIN_CONTENT_ENABLED: 'true', ASSETS: assets,
    ...(fault === 'throwing' ? { GENSHIN_CONTENT: { fetch: async () => { throw new Error('offline'); } } } : {}) };
  if (fault === 'context') context.get.mockImplementation(() => { throw new Error('context unavailable'); });
  else context.get.mockReturnValue({ env });
  await expect(getGenshinFreshnessGuides()).rejects.toThrow(GenshinContentUnavailableError);
  const result = await getDashboardFreshnessFindings();
  expect(result.genshinGuideCount).toBeNull();
  expect(result.findings.some(row => row.gameId === 'starrail')).toBe(true);
  expect(assets.fetch).not.toHaveBeenCalled();
  expect(other.load.mock.calls.every(([_path, asset]) => !String(asset).includes('/genshin/'))).toBe(true);
});

it.each(['duplicate', 'id', 'text', 'missing', 'large-text', 'rows', 'null', 'object'])('rejects malformed guide %s data', async fault => {
  let value = snapshot();
  if (fault === 'duplicate') value.push(value[0]);
  if (fault === 'id') value[0].id = '../escape';
  if (fault === 'text') value[0].content = 5;
  if (fault === 'missing') delete value[0].id;
  if (fault === 'large-text') value[0].content = 'x'.repeat(256 * 1024 + 1);
  if (fault === 'rows') value = Array.from({ length: 1001 }, (_, index) => ({ id: `guide-${index}` }));
  if (fault === 'null') value = null;
  if (fault === 'object') value = {};
  await expect(readGenshinFreshnessGuides(ownerEnv(value))).rejects.toThrow(GenshinContentUnavailableError);
});

it.each(['status', 'redirect', 'cookie', 'mime', 'json', 'utf8', 'length', 'stream'])('rejects upstream %s failures', async fault => {
  const headers = { 'content-type': fault === 'mime' ? 'text/html' : 'application/json',
    ...(fault === 'cookie' ? { 'set-cookie': 'private=1' } : {}),
    ...(fault === 'length' ? { 'content-length': String(1024 * 1024 + 1) } : {}) };
  const response = new Response(fault === 'utf8' ? new Uint8Array([0xff])
    : fault === 'json' ? '{' : fault === 'stream' ? ' '.repeat(1024 * 1024 + 1) : JSON.stringify(snapshot()),
  { status: fault === 'status' ? 503 : fault === 'redirect' ? 302 : 200, headers });
  await expect(readGenshinFreshnessGuides({ GENSHIN_CONTENT_ENABLED: 'true',
    GENSHIN_CONTENT: { fetch: async () => response } })).rejects.toThrow(GenshinContentUnavailableError);
});

it.each(['headers', 'body'])('bounds %s stalls and does not await cancellation', async phase => {
  vi.useFakeTimers();
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const stream = new ReadableStream<Uint8Array>({ pull() { return new Promise(() => {}); }, cancel });
  const fetch = vi.fn(async (_request: Request): Promise<Response> => phase === 'headers' ? new Promise(() => {})
    : new Response(stream, { headers: { 'content-type': 'application/json' } }));
  const pending = expect(readGenshinFreshnessGuides({ GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: { fetch } }))
    .rejects.toThrow(GenshinContentUnavailableError);
  await vi.advanceTimersByTimeAsync(5001); await pending;
  expect(fetch.mock.calls[0]![0].signal.aborted).toBe(true);
  if (phase === 'body') expect(cancel).toHaveBeenCalled();
});

it('rereads owner A/B bodies, applies the unchanged scanner and keeps all other game findings', async () => {
  FRESHNESS_WATCH_TERMS.push({ term: 'r112-test-only-term', games: ['genshin'], currentRoute: 'test-only' });
  let active: FreshnessGuide[] = [{ id: 'owner-guide', content: 'r112-test-only-term' }];
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: { fetch: async () => Response.json(active) } } });
  const a = await getDashboardFreshnessFindings();
  expect(a.genshinGuideCount).toBe(1); expect(a.genshinRuleCount).toBe(1);
  expect(a.findings.filter(row => row.gameId === 'genshin')).toEqual(scanFreshnessGuides('genshin', active, '/_games/genshin/content/data/raw-guides.json'));
  active = [{ id: 'owner-guide', content: 'Archive note: r112-test-only-term' }, { id: 'second-guide', title: 'Owner B' }];
  const b = await getDashboardFreshnessFindings();
  expect(b.genshinGuideCount).toBe(2);
  expect(b.findings.find(row => row.gameId === 'genshin')?.severity).toBe('archive');
  expect(b.findings.filter(row => row.gameId !== 'genshin')).toEqual(a.findings.filter(row => row.gameId !== 'genshin'));
  expect(other.load.mock.calls.map(([_path, asset]) => asset)).toEqual(Array(2).fill(freshnessGuideGames.filter(game => game !== 'genshin').map(game => `/data/${game}/raw-guides.json`)).flat());
});

it.each(['zh', 'en', 'ja'])('renders request-time owner updates and an explicit partial failure for %s', async lang => {
  let active = snapshot();
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: { fetch: async () => Response.json(active) } } });
  expect(await render(lang)).toContain(lang === 'en' ? `Genshin: ${snapshot().length} guides / 0 rules` : lang === 'zh' ? `原神：${snapshot().length} 篇攻略 / 0 条检测规则` : `原神：攻略${snapshot().length}件 / 検査ルール0件`);
  active = [...active, { id: 'owner-b-guide', title: 'Owner B' }];
  expect(await render(lang)).toContain(lang === 'en' ? `Genshin: ${snapshot().length + 1} guides / 0 rules` : lang === 'zh' ? `原神：${snapshot().length + 1} 篇攻略 / 0 条检测规则` : `原神：攻略${snapshot().length + 1}件 / 検査ルール0件`);
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true' } });
  const unavailable = await render(lang);
  expect(unavailable).toContain(lang === 'en' ? 'this scan is incomplete' : lang === 'zh' ? '本轮检查未完成' : '今回の検査は未完了');
  expect(unavailable).not.toContain('No stale-term risk found');
  expect(unavailable).toContain('starrail');
  expect(dynamic).toBe('force-dynamic');
  expect(middleware(new NextRequest(`https://gachia.com/${lang}/tools/market-intel`)).headers.get('cache-control')).toBe('no-store');
  expect(middleware(new NextRequest(`https://gachia.com/${lang}/about`)).headers.get('cache-control')).toContain('public');
  expect((await generateMetadata({ params: Promise.resolve({ lang }) })).robots).toEqual({ index: false, follow: false });
});

it('does not swallow unrelated game loader failures or invent missing owner rules', async () => {
  context.get.mockReturnValue({ env: ownerEnv([]) });
  expect(await getDashboardFreshnessFindings()).toMatchObject({ genshinGuideCount: 0, genshinRuleCount: 0 });
  other.load.mockRejectedValue(new Error('other game unavailable'));
  await expect(getDashboardFreshnessFindings()).rejects.toThrow('other game unavailable');
});
