import { GAMES, LOCALES } from '@gachia/core';
import { nteGuides, nteCharacters, genshinCharacters, genshinGuides, genshinArtifactSets, wuwaCharacters, wuwaGuides } from '@gachia/data';
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

    // Genshin character detail pages
    for (const char of genshinCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // Genshin artifact detail pages
    for (const set of genshinArtifactSets) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/artifacts/${set.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // Genshin guide detail pages
    for (const guide of genshinGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/guides/${guide.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // WuWa character detail pages
    for (const char of wuwaCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // WuWa guide detail pages
    for (const guide of wuwaGuides) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/guides/${guide.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
