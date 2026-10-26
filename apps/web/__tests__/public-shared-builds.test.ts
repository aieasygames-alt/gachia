import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { getRouteOwner } from '@gachia/core';

const mocks = vi.hoisted(() => ({ select: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: () => ({ select: mocks.select }) }));
vi.mock('@/lib/auth', () => ({ createAuth: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children }: { children: string }) => createElement('span', null, children) }));
vi.mock('@/components/wiki/character-avatar', () => ({ CharacterAvatar: () => null }));
vi.mock('@/lib/game-data/shared-builds', () => ({ getSharedBuildCharacters: vi.fn().mockResolvedValue([]) }));
import { GET } from '../app/api/shared-builds/route';
import Page, * as pageModule from '../app/[lang]/[game]/shared/[id]/page';
import middleware from '../middleware';

const now = new Date('2026-10-26T00:00:00Z');
const row = () => ({ id: 'shared123', gameId: 'genshin', characterId: 'amber', buildData: '{"weapon":"test"}',
  createdAt: new Date('2026-01-01T00:00:00Z'), expiresAt: null as Date | null,
  userId: 'private-owner', viewCount: 42, internalSecret: 'private-field' });
const read = (id = 'shared123') => GET(new NextRequest(`https://gachia.com/api/shared-builds?id=${id}`));
const page = (game = 'genshin') => Page({ params: Promise.resolve({ lang: 'en', game, id: 'shared123' }) });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.resetAllMocks();
  mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  mocks.limit.mockResolvedValue([row()]);
});
afterEach(() => vi.useRealTimers());

it.each([-1, 0, NaN])('rejects expired or invalid expiry (%s) in both public readers', async offset => {
  mocks.limit.mockResolvedValue([{ ...row(), expiresAt: new Date(now.getTime() + offset) }]);
  const response = await read();
  expect(response.status).toBe(404);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Build not found' });
  await expect(page()).rejects.toThrow('NOT_FOUND');
});

it.each([null, 1, 3600000])('keeps permanent and unexpired shares readable (%s)', async offset => {
  const build = { ...row(), expiresAt: offset === null ? null : new Date(now.getTime() + offset) };
  mocks.limit.mockResolvedValue([build]);
  const response = await read();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ id: build.id, gameId: build.gameId, characterId: build.characterId,
    buildData: build.buildData, createdAt: build.createdAt.toISOString() });
  const html = renderToStaticMarkup(await page());
  expect(html).toContain('weapon');
  for (const field of ['private-owner', 'private-field', 'userId', 'expiresAt', 'viewCount']) expect(html).not.toContain(field);
});

it('selects only public columns and expiry, never the owner or the entire row', async () => {
  await read();
  expect(Object.keys(mocks.select.mock.calls[0]![0]).sort()).toEqual(['id', 'gameId', 'characterId', 'buildData', 'createdAt', 'expiresAt'].sort());
});

it('checks expiry after database latency and again on subsequent requests', async () => {
  const build = { ...row(), expiresAt: new Date(now.getTime() + 1000) };
  mocks.limit.mockResolvedValue([build]);
  expect((await read()).status).toBe(200);
  mocks.limit.mockImplementation(async () => { vi.setSystemTime(now.getTime() + 1000); return [build]; });
  expect((await read()).status).toBe(404);
  await expect(page()).rejects.toThrow('NOT_FOUND');
});

it('returns not found for missing shares and wrong-game page URLs', async () => {
  await expect(page('starrail')).rejects.toThrow('NOT_FOUND');
  mocks.limit.mockResolvedValue([]);
  expect((await read()).status).toBe(404);
  await expect(page()).rejects.toThrow('NOT_FOUND');
});

it('does not cache missing-id errors or query the database for them', async () => {
  const response = await read('');
  expect(response.status).toBe(400);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.select).not.toHaveBeenCalled();
});

it('opts out of page caching and middleware public-cache overrides', () => {
  expect(pageModule).toHaveProperty('dynamic', 'force-dynamic');
  for (const locale of ['zh', 'en', 'ja']) {
    for (const game of ['genshin', 'nte', 'azur-promilia']) {
      const path = `/${locale}/${game}/shared/shared123`;
      expect(getRouteOwner(path)).toBe('main');
      const response = middleware(new NextRequest(`https://gachia.com${path}`));
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  }
  expect(middleware(new NextRequest('https://gachia.com/en/about')).headers.get('cache-control')).toContain('public');
});
