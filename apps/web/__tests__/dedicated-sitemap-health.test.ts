import { describe, expect, it } from 'vitest';
import sitemap from '../../game-azur-promilia/app/sitemap';
import { characters, guides, tierLists, weapons } from '../../game-azur-promilia/lib/data';

describe('Azur Promilia sitemap publication health', () => {
  it('publishes each URL once without losing a directory or detail route', () => {
    const entries = sitemap();
    const urls = entries.map(entry => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    const base = ['', 'characters', 'weapons', 'guides', 'systems', 'redeem-codes', 'kibo', 'world', 'planner', 'version', 'travel-trace'];
    if (tierLists.some(list => list.entries.length > 0)) base.push('tier-list');
    const suffixes = [...base, ...characters.map(row => `characters/${row.id}`),
      ...weapons.map(row => `weapons/${row.id}`), ...guides.map(row => `guides/${row.id}`)];
    expect(urls.toSorted()).toEqual(['zh', 'en', 'ja'].flatMap(locale => suffixes.map(suffix =>
      `https://gachia.com/${locale}/azur-promilia${suffix ? `/${suffix}` : ''}`)).toSorted());
    for (const locale of ['zh', 'en', 'ja']) for (const directory of ['kibo', 'world']) {
      const matches = entries.filter(row => row.url === `https://gachia.com/${locale}/azur-promilia/${directory}`);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ changeFrequency: 'weekly', priority: 0.6 });
    }
  });
});
