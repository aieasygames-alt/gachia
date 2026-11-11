import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { genshinPlatformSchema, type GenshinPlatformContent } from '@gachia/core/genshin-platform';
import { genshinContentAssets } from '../../../scripts/genshin-content-assets.mjs';
import { GenshinContentUnavailableError, getGenshinPlatformContent, readGenshinPlatformContent,
  type GenshinPlatformBindings } from '@/lib/genshin-platform-content';
import { getSharedBuildCharacters } from '@/lib/game-data/shared-builds';
import { composeHomepageContent, getHomepageContent } from '@/lib/homepage-content';

const context = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: context.get }));
const snapshot = () => genshinPlatformSchema.parse(JSON.parse(String(genshinContentAssets().files.get('platform.json'))));
const reply = (value: unknown) => Response.json(value);
const binding = (fetch: (request: Request) => Promise<Response>) => ({ fetch: vi.fn(fetch) });
const gameEnv = (value: unknown) => ({ GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: binding(async () => reply(value)) });

beforeEach(() => { context.get.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

it('validates the real CMS-derived platform projection without embedding guide bodies or private records', () => {
  const content = snapshot();
  expect(content.data.characters.length).toBeGreaterThan(100);
  expect(content.data.characters.find(row => row.id === 'hu-tao')).toMatchObject({ name: { zh: '胡桃' }, element: 'pyro' });
  expect(JSON.stringify(content)).not.toContain('recommendedBuild');
  expect(JSON.stringify(content)).not.toContain('contentEn');
  expect(Buffer.byteLength(JSON.stringify(content))).toBeLessThan(512 * 1024);
});

it.each([undefined, 'false', 'TRUE', '1'])('reads the explicit Main compatibility asset when the switch is %s', async flag => {
  const value = snapshot(), assets = binding(async () => reply(value)), game = binding(async () => reply(null));
  expect(await readGenshinPlatformContent({ GENSHIN_CONTENT_ENABLED: flag, ASSETS: assets, GENSHIN_CONTENT: game })).toEqual(value);
  expect(assets.fetch.mock.calls[0]![0].url).toBe('https://gachia.com/data-client/genshin-platform.json');
  expect(game.fetch).not.toHaveBeenCalled();
});

it('uses the dedicated service binding without public Internet requests, authentication or a Main callback', async () => {
  const value = snapshot(), env = gameEnv(value), assets = binding(async () => reply(null));
  context.get.mockReturnValue({ env: { ...env, ASSETS: assets } });
  expect(await getGenshinPlatformContent()).toEqual(value);
  const request = env.GENSHIN_CONTENT.fetch.mock.calls[0]![0];
  expect(request.url).toBe('https://gachia.com/_games/genshin/content/platform.json');
  expect(request.method).toBe('GET');
  expect(request.redirect).toBe('manual');
  expect([...request.headers]).toEqual([['accept', 'application/json']]);
  expect(assets.fetch).not.toHaveBeenCalled();
});

it('does not fall back to an old Main snapshot for an enabled but missing or failed game binding', async () => {
  const assets = binding(async () => reply(snapshot()));
  for (const env of [
    { GENSHIN_CONTENT_ENABLED: 'true', ASSETS: assets },
    { GENSHIN_CONTENT_ENABLED: 'true', ASSETS: assets, GENSHIN_CONTENT: binding(async () => { throw new Error('offline'); }) },
  ]) await expect(readGenshinPlatformContent(env)).rejects.toThrow(GenshinContentUnavailableError);
  expect(assets.fetch).not.toHaveBeenCalled();
});

it('normalizes a missing OpenNext request context into the same availability error', async () => {
  context.get.mockImplementation(() => { throw new Error('request context missing'); });
  const error = await getGenshinPlatformContent().catch(error => ({ name: error.name, message: error.message }));
  expect(error).toEqual({ name: 'GenshinContentUnavailableError', message: 'Genshin content unavailable' });
});

it.each(['owner', 'version', 'schema', 'name', 'duplicate', 'image', 'date'])('rejects invalid %s data', async fault => {
  const value = snapshot();
  const character = value.data.characters[0]!;
  if (fault === 'owner') Reflect.set(value, 'owner', 'main');
  if (fault === 'version') value.version = 'unversioned';
  if (fault === 'schema') Reflect.set(value, 'schemaVersion', 2);
  if (fault === 'name') character.name.en = '';
  if (fault === 'duplicate') value.data.characters.push(character);
  if (fault === 'image') character.imageUrl = 'https://example.invalid/character.webp';
  if (fault === 'date') value.data.guides[0]!.updatedAt = '2026-02-30';
  await expect(readGenshinPlatformContent(gameEnv(value))).rejects.toThrow(GenshinContentUnavailableError);
});

it.each(['status', 'redirect', 'cookie', 'mime', 'json', 'utf8', 'length', 'stream'])('rejects invalid upstream %s responses', async fault => {
  const bytes = JSON.stringify(snapshot());
  let response: Response;
  if (fault === 'status') response = new Response('unavailable', { status: 503 });
  else if (fault === 'redirect') response = new Response(null, { status: 302, headers: { location: '/login' } });
  else if (fault === 'utf8') response = new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } });
  else response = new Response(fault === 'json' ? '{' : fault === 'stream' ? ' '.repeat(512 * 1024 + 1) : bytes, {
    headers: { 'content-type': fault === 'mime' ? 'text/html' : 'application/json',
      ...(fault === 'cookie' ? { 'set-cookie': 'session=private' } : {}),
      ...(fault === 'length' ? { 'content-length': String(512 * 1024 + 1) } : {}) },
  });
  const env: GenshinPlatformBindings = { GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: binding(async () => response) };
  await expect(readGenshinPlatformContent(env)).rejects.toThrow(GenshinContentUnavailableError);
});

it.each(['headers', 'body'])('bounds the entire %s read and does not await a hanging cancellation', async phase => {
  vi.useFakeTimers();
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const stream = new ReadableStream<Uint8Array>({ pull() { return new Promise(() => {}); }, cancel });
  const game = binding(async () => phase === 'headers' ? new Promise<Response>(() => {})
    : new Response(stream, { headers: { 'content-type': 'application/json' } }));
  const read = readGenshinPlatformContent({ GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: game });
  const rejected = expect(read).rejects.toThrow(GenshinContentUnavailableError);
  await vi.advanceTimersByTimeAsync(5001);
  await rejected;
  expect(game.fetch.mock.calls[0]![0].signal.aborted).toBe(true);
  if (phase === 'body') expect(cancel).toHaveBeenCalled();
});

it('reads each request afresh, so A/B character names, images and guide summaries change without a Main rebuild', async () => {
  let active = snapshot();
  const game = binding(async () => reply(active));
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true', GENSHIN_CONTENT: game } });
  const a = await getSharedBuildCharacters('genshin', ['hu-tao', 'missing', 'hu-tao'], 'en');
  expect(a.map(row => row.name)).toEqual(['Hu Tao', 'Hu Tao']);
  active = structuredClone(active);
  active.version = 'b'.repeat(64);
  active.data.characters[0]!.name.en = 'Owner B character';
  active.data.characters[0]!.imageUrl = 'https://img.gachia.com/images/genshin/characters/owner-b.webp';
  active.data.guides.find(row => row.id === 'banner-schedule-guide')!.summary.en = 'Owner B summary';
  const b = await getSharedBuildCharacters('genshin', ['hu-tao'], 'en');
  expect(b[0]).toMatchObject({ name: 'Owner B character', imageUrl: active.data.characters[0]!.imageUrl });
  const home = await getHomepageContent();
  expect(home.featured[0]!.name.en).toBe('Owner B character');
  expect(home.banners.find(row => row.gameId === 'genshin')!.summary.en).toBe('Owner B summary');
  expect(game.fetch).toHaveBeenCalledTimes(3);
});

it('keeps Japanese localization, caller order, unknown IDs and upcoming exclusions consistent', async () => {
  const value = snapshot();
  value.data.characters[0]!.name.ja = 'Localized character';
  context.get.mockReturnValue({ env: gameEnv(value) });
  const entries = await getSharedBuildCharacters('genshin', ['missing', 'raiden-shogun', 'hu-tao'], 'ja');
  expect(entries.map(row => row.id)).toEqual(['raiden-shogun', 'hu-tao']);
  expect(entries[1]!.name).toBe('Localized character');
});

it('preserves other game feeds and removes unavailable Genshin facts instead of inventing a successful refresh', async () => {
  const a = composeHomepageContent(snapshot()), b = composeHomepageContent(null);
  for (const key of ['banners', 'versions', 'codes', 'guides'] as const) {
    expect(b[key].filter(row => row.gameId !== 'genshin')).toEqual(a[key].filter(row => row.gameId !== 'genshin'));
    expect(b[key].some(row => row.gameId === 'genshin')).toBe(false);
  }
  context.get.mockReturnValue({ env: { GENSHIN_CONTENT_ENABLED: 'true' } });
  expect(await getHomepageContent()).toMatchObject({ genshinUnavailable: true, featured: [], version: null });
  await expect(getSharedBuildCharacters('genshin', ['hu-tao'], 'zh')).rejects.toThrow(GenshinContentUnavailableError);
});

it('expires codes at UTC+8 midnight and never promotes expired, unrevealed or disabled entries to active', () => {
  const value: GenshinPlatformContent = snapshot();
  value.data.codes = [
    { code: 'LIVE', status: 'active', revealedAt: '2026-11-01', expiresAt: '2026-11-10' },
    { code: 'DISABLED', status: 'expired', revealedAt: '2026-11-01', expiresAt: '2027-01-01' },
    { code: 'FUTURE', status: 'active', revealedAt: '2026-12-01', expiresAt: '2027-01-01' },
  ];
  const count = (now: string) => composeHomepageContent(value, new Date(now)).codes.find(row => row.gameId === 'genshin')!.summary.en;
  expect(count('2026-11-10T15:59:59Z')).toContain('1 active');
  expect(count('2026-11-10T16:00:00Z')).toContain('0 active');
});
