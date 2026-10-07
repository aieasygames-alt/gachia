import { describe, expect, it } from 'vitest';
import { GAME_DEPLOYMENTS } from '@gachia/core';
import robots from '../app/robots';

describe('robots sitemap discovery', () => {
  it('lists the root sitemap and every live dedicated Worker sitemap', () => {
    const sitemapUrls = Array.isArray(robots().sitemap) ? robots().sitemap : [robots().sitemap];

    expect(sitemapUrls).toContain('https://gachia.com/sitemap.xml');
    for (const deployment of Object.values(GAME_DEPLOYMENTS)) {
      if (deployment?.deployment !== 'game' || deployment.status !== 'live' || !deployment.sitemapPath) continue;
      expect(sitemapUrls).toContain(`https://gachia.com${deployment.sitemapPath}`);
    }
  });
});
