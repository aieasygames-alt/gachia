import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSearchItems, searchItems, SEARCH_QUERY_LIMIT } from '@/lib/search-results';

describe('shared search results', () => {
  const row = { id: 'sample', name: 'Sample', nameAlt: '示例' };
  const index = buildSearchItems({ genshin: { characters: [row], weapons: [row], artifacts: [row], items: [row] } });
  it('sorts result types, trims input, supports both names, and leaves the index intact', () => {
    expect(searchItems(index, ' SAMPLE ').map((item) => item.type)).toEqual(['character', 'weapon', 'artifact', 'item']);
    expect(searchItems(index, '示例')).toHaveLength(4);
    expect(index.map((item) => item.type)).toEqual(['character', 'weapon', 'item', 'artifact']);
  });
  it('bounds results and refuses empty, disallowed, or oversized queries', () => {
    expect(searchItems(index, '  ')).toEqual([]);
    expect(searchItems(index, 'nsfw')).toEqual([]);
    expect(searchItems(index, 'a'.repeat(SEARCH_QUERY_LIMIT + 1))).toEqual([]);
    expect(searchItems(Array.from({ length: 50 }, () => index[0]!), 'sample')).toHaveLength(30);
  });
  it('preserves owner-specific artifact routes and encodes individual slugs', () => {
    const results = buildSearchItems(Object.fromEntries(['nte', 'starrail', 'wuwa', 'genshin'].map((game) => [game, { artifacts: [{ ...row, id: 'a/b ?' }] }])));
    expect(results.map((item) => item.url)).toEqual(['/nte/disk-sets/a%2Fb%20%3F', '/starrail/relics/a%2Fb%20%3F', '/wuwa/echoes/a%2Fb%20%3F', '/genshin/artifacts/a%2Fb%20%3F']);
  });
  for (const locale of ['zh', 'en', 'ja']) {
    it(`keeps the existing generated ${locale} index searchable`, () => {
      const data = JSON.parse(readFileSync(new URL(`../public/data-manifest/search-${locale}.json`, import.meta.url), 'utf8'));
      const items = buildSearchItems(data);
      expect(items.length).toBeGreaterThan(100);
      expect(searchItems(items, 'nanally').some((item) => item.url === '/nte/characters/nanally')).toBe(true);
      expect(searchItems(items, 'hu tao').some((item) => item.url === '/genshin/characters/hu-tao')).toBe(true);
      expect(items.every((item) => item.url.startsWith(`/${item.gameId}/`))).toBe(true);
    });
  }
  it('shares the same algorithm between dialog and page without cross-owner client transitions', () => {
    for (const file of ['search-dialog.tsx', 'search-page.tsx']) {
      const source = readFileSync(new URL(`../components/search/${file}`, import.meta.url), 'utf8');
      expect(source).toContain('buildSearchItems(');
      expect(source).toContain('searchItems(index, query)');
      expect(source).toContain('data-search-result');
      expect(source).not.toMatch(/\brouter\.(push|replace)\s*\(/);
      expect(source).not.toContain("from 'next/link'");
    }
  });
});
