import { GAME_DEPLOYMENTS, getRouteOwner, isMainSitemapPath } from '@gachia/core';
import { nteMaterials } from '@gachia/data/games/nte/items';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sitemap from '../app/sitemaps/main/sitemap';
import { GET } from '../app/sitemap.xml/route';
import { getSitemapPaths, MAIN_SITEMAP_PATH } from '../lib/sitemap-index';

describe('sitemap deployment shards', () => {
  it('does not load migrated NTE detail sources into the Main Worker', () => {
    const source = readFileSync(fileURLToPath(new URL('../app/sitemaps/main/sitemap.ts', import.meta.url)), 'utf8');
    expect(source).not.toContain('@gachia/data/games/nte/');
  });

  it('includes each live dedicated Worker sitemap in the root sitemap', async () => {
    const response = GET();
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    const xml = await response.text();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(xml).not.toContain('<url>');
    expect(xml).toContain(`<sitemap><loc>https://gachia.com${MAIN_SITEMAP_PATH}</loc></sitemap>`);

    for (const deployment of Object.values(GAME_DEPLOYMENTS)) {
      if (deployment?.deployment !== 'game' || deployment.status !== 'live' || !deployment.sitemapPath) continue;
      expect(xml).toContain(`<sitemap><loc>https://gachia.com${deployment.sitemapPath}</loc></sitemap>`);
    }
  });

  it('does not include preview Worker sitemaps in the root sitemap', async () => {
    for (const status of ['draft', 'preview', 'maintenance', 'retired'] as const) {
      expect(getSitemapPaths({ test: { deployment: 'game', status, worker: 'test', sitemapPath: '/sitemaps/test/index.xml' } })).toEqual([MAIN_SITEMAP_PATH]);
    }
  });

  it('rejects missing, unsafe and duplicate live shard paths', () => {
    const owner = { deployment: 'game', status: 'live', worker: 'test' } as const;
    for (const sitemapPath of [undefined, 'https://preview.test/sitemap.xml', '/sitemaps/a/../index.xml']) {
      expect(() => getSitemapPaths({ test: { ...owner, sitemapPath } })).toThrow();
    }
    const deployment = { ...owner, sitemapPath: '/sitemaps/test/index.xml' };
    expect(() => getSitemapPaths({ a: deployment, b: deployment })).toThrow();
  });

  it('keeps dedicated paths out after moving the NTE material details', async () => {
    const urls = (await sitemap()).map(entry => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(getRouteOwner(new URL(url).pathname)).toBe('main');
      expect(isMainSitemapPath(new URL(url).pathname)).toBe(true);
    }
    const expectedItems = ['zh', 'en', 'ja'].flatMap(locale => nteMaterials.map(item => `https://gachia.com/${locale}/nte/items/${item.id}`));
    expect(expectedItems.length).toBe(171);
    expect(urls.filter(url => new URL(url).pathname.split('/')[2] === 'nte')).toEqual([]);
    for (const game of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) {
      expect(urls.some(url => new URL(url).pathname.split('/')[2] === game)).toBe(false);
    }
    expect(urls).not.toContain('https://gachia.com/ja/nte/guides/untranslated');
    expect(urls).not.toContain('https://gachia.com/ja/nte/characters');
    expect(urls.some(url => new URL(url).pathname.startsWith('/sitemaps/'))).toBe(false);
  });

  it('includes the Aniimo-only S1 starter checks page in every supported locale', async () => {
    const entries = await sitemap();

    for (const locale of ['zh', 'en', 'ja']) {
      expect(entries.some((entry) => entry.url === `https://gachia.com/${locale}/aniimo/s1-check`)).toBe(true);
    }
  });
});
