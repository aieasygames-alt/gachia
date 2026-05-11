import { GAMES, LOCALES } from '@gachia/core';
import {
  nteGuides, nteCharacters,
  genshinCharacters, genshinGuides, genshinArtifactSets,
  wuwaCharacters, wuwaGuides,
  starrailCharacters, starrailGuides, starrailRelicSets,
} from '@gachia/data';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gachia.com';

// Revalidate every 24 hours
export const revalidate = 86400;

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

    // --- Genshin Impact detail pages ---
    for (const char of genshinCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const set of genshinArtifactSets) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/artifacts/${set.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const guide of genshinGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/guides/${guide.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // --- Star Rail detail pages ---
    for (const char of starrailCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/starrail/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const set of starrailRelicSets) {
      entries.push({
        url: `${BASE_URL}/${locale}/starrail/artifacts/${set.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const guide of starrailGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/starrail/guides/${guide.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // --- WuWa detail pages ---
    for (const char of wuwaCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const guide of wuwaGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/guides/${guide.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // --- NTE detail pages ---
    for (const char of nteCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const guide of nteGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/guides/${guide.id}`,
        lastModified: guide.date ? new Date(guide.date) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
