import { GAME_DEPLOYMENTS } from '@gachia/core';
import { describe, expect, it } from 'vitest';
import sitemap from '../app/sitemap';

describe('sitemap deployment shards', () => {
  it('includes each live dedicated Worker sitemap in the root sitemap', async () => {
    const entries = await sitemap();

    for (const deployment of Object.values(GAME_DEPLOYMENTS)) {
      if (deployment?.deployment !== 'game' || deployment.status !== 'live' || !deployment.sitemapPath) continue;
      expect(entries.some((entry) => entry.url === `https://gachia.com${deployment.sitemapPath}`)).toBe(true);
    }
  });

  it('does not include preview Worker sitemaps in the root sitemap', async () => {
    const entries = await sitemap();

    for (const deployment of Object.values(GAME_DEPLOYMENTS)) {
      if (deployment?.deployment !== 'game' || deployment.status !== 'preview' || !deployment.sitemapPath) continue;
      expect(entries.some((entry) => entry.url === `https://gachia.com${deployment.sitemapPath}`)).toBe(false);
    }
  });
});
