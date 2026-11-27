import { afterEach, describe, expect, it, vi } from 'vitest';
import { STARRAIL_CMS_GUIDES } from '@gachia/data/cms/starrail-guides';
import seed from '@gachia/data/cms/starrail-snapshot.json';
import { parseStarRailPublication } from '@gachia/data/cms/starrail-publication';

const { prepare, first, run } = vi.hoisted(() => ({ prepare: vi.fn(), first: vi.fn(), run: vi.fn() }));
vi.mock('@/lib/db', () => ({ getD1: () => ({ prepare }) }));
import { GET, PUT } from '@/app/api/cms/starrail/route';
import { NextRequest } from 'next/server';
import middleware from '@/middleware';

describe('Star Rail cloud publication', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it('disables browser and CDN HTML caching for all live Star Rail CMS readers', () => {
    for (const locale of ['zh', 'en', 'ja']) {
      for (const route of ['', '/version', '/events', '/characters', '/characters/aha', '/characters/yaoguang', '/characters/silver-wolf-lv999', '/characters/sparxie', '/characters/acheron', '/calculator', '/guides/banner-schedule-guide', ...Object.keys(STARRAIL_CMS_GUIDES).map(slug => `/guides/${slug}`)]) {
        const response = middleware(new NextRequest(`https://gachia.com/${locale}/starrail${route}`));
        expect(response.headers.get('cache-control')).toBe('no-store');
      }
    }
    expect(middleware(new NextRequest('https://gachia.com/zh/starrail/characters/seele')).headers.get('cache-control')).toContain('public');
    expect(middleware(new NextRequest('https://gachia.com/zh/wuwa/version')).headers.get('cache-control')).toContain('public');
  });
  it('accepts a complete empty withdrawal but rejects drafts, duplicate identities and other games', () => {
    expect(parseStarRailPublication({ revision: 1, docs: [] })).toEqual({ revision: 1, docs: [] });
    for (const docs of [[{ ...seed[0], _status: 'draft' }], [seed[0], seed[0]], [{ ...seed[0], gameId: 'genshin' }]]) {
      expect(parseStarRailPublication({ revision: 1, docs })).toBeNull();
    }
    expect(parseStarRailPublication({ revision: 1, docs: seed })?.docs).toHaveLength(3);
  });
  it('redirects the legacy Yao Guang detail to the CMS page in the same language', () => {
    for (const locale of ['zh', 'en', 'ja']) {
      const response = middleware(new NextRequest(`https://gachia.com/${locale}/starrail/characters/yao-guang`));
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(`https://gachia.com/${locale}/starrail/characters/yaoguang`);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });
  it('denies anonymous writes before reading the body or accessing storage', async () => {
    const response = await PUT(new Request('https://gachia.com/api/cms/starrail', { method: 'PUT', body: '{}' }));
    expect(response.status).toBe(401); expect(prepare).not.toHaveBeenCalled();
  });
  it('does not publish invalid or draft content', async () => {
    vi.stubEnv('STARRAIL_PUBLISH_TOKEN', 'test-token');
    const response = await PUT(new Request('https://gachia.com/api/cms/starrail', { method: 'PUT', headers: {
      authorization: 'Bearer test-token', 'content-type': 'application/json',
    }, body: JSON.stringify({ revision: 2, docs: [{ ...seed[0], _status: 'draft' }] }) }));
    expect(response.status).toBe(400); expect(prepare).not.toHaveBeenCalled();
  });
  it('rejects oversized chunked requests', async () => {
    vi.stubEnv('STARRAIL_PUBLISH_TOKEN', 'test-token');
    const response = await PUT(new Request('https://gachia.com/api/cms/starrail', { method: 'PUT', headers: {
      authorization: 'Bearer test-token', 'content-type': 'application/json',
    }, body: ' '.repeat(512 * 1024 + 1) }));
    expect(response.status).toBe(413); expect(prepare).not.toHaveBeenCalled();
  });
  it('serves only the requested language without caching', async () => {
    first.mockResolvedValue({ payload: JSON.stringify({ revision: 2, docs: seed }) });
    prepare.mockReturnValue({ first });
    const response = await GET(new Request('https://gachia.com/api/cms/starrail?locale=en'));
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ revision: 2, docs: [] });
  });
  it('refuses a stale publication after the atomic conditional write', async () => {
    vi.stubEnv('STARRAIL_PUBLISH_TOKEN', 'test-token');
    first.mockResolvedValue({ revision: 3, payload: '{}' });
    prepare.mockReturnValue({ bind: () => ({ run }), first });
    const response = await PUT(new Request('https://gachia.com/api/cms/starrail', { method: 'PUT', headers: {
      authorization: 'Bearer test-token', 'content-type': 'application/json',
    }, body: JSON.stringify({ revision: 2, docs: [] }) }));
    expect(response.status).toBe(409); expect(run).toHaveBeenCalledTimes(1);
  });
});
