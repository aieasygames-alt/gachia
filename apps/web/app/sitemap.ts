import { GAMES, LOCALES } from '@gachia/core';
import { nteGuides, nteCharacters } from '@gachia/data';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gachia.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Home pages for each locale
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    });

    // Game home pages
    for (const [gameId, game] of Object.entries(GAMES)) {
      entries.push({
        url: `${BASE_URL}/${locale}/${gameId}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      // Category pages
      for (const [route, enabled] of Object.entries(game.routes)) {
        if (!enabled) continue;
        entries.push({
          url: `${BASE_URL}/${locale}/${gameId}/${route}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }

    // NTE guide detail pages
    for (const guide of nteGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/guides/${guide.id}`,
        lastModified: guide.date ? new Date(guide.date) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // NTE character detail pages
    for (const char of nteCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
