import { GAMES, LOCALES } from '@gachia/core';
import {
  nteGuides, nteCharacters, nteWeapons, nteMaterials, nteDiskSets,
  genshinCharacters, genshinGuides, genshinArtifactSets, genshinWeapons, genshinMaterials,
  wuwaCharacters, wuwaGuides, wuwaWeapons, wuwaMaterials, wuwaEchoSets,
  starrailCharacters, starrailGuides, starrailRelicSets, starrailLightCones, starrailMaterials,
  zzzCharacters, zzzWeapons, zzzMaterials, zzzDriveDiscs,
  guihuanCharacters, guihuanWeapons, guihuanMaterials,
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

    for (const weapon of genshinWeapons) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/weapons/${weapon.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const mat of genshinMaterials) {
      entries.push({
        url: `${BASE_URL}/${locale}/genshin/items/${mat.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
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

    for (const lc of starrailLightCones) {
      entries.push({
        url: `${BASE_URL}/${locale}/starrail/weapons/${lc.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const mat of starrailMaterials) {
      entries.push({
        url: `${BASE_URL}/${locale}/starrail/items/${mat.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
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

    for (const weapon of wuwaWeapons) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/weapons/${weapon.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const mat of wuwaMaterials) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/items/${mat.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const echo of wuwaEchoSets) {
      entries.push({
        url: `${BASE_URL}/${locale}/wuwa/echoes/${echo.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
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

    for (const weapon of nteWeapons) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/weapons/${weapon.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const mat of nteMaterials) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/items/${mat.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const ds of nteDiskSets) {
      entries.push({
        url: `${BASE_URL}/${locale}/nte/disk-sets/${ds.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    // --- ZZZ detail pages ---
    for (const char of zzzCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/zzz/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const weapon of zzzWeapons) {
      entries.push({
        url: `${BASE_URL}/${locale}/zzz/weapons/${weapon.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const mat of zzzMaterials) {
      entries.push({
        url: `${BASE_URL}/${locale}/zzz/items/${mat.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }

    for (const dd of zzzDriveDiscs) {
      entries.push({
        url: `${BASE_URL}/${locale}/zzz/drive-discs/${dd.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    // --- Guihuan detail pages ---
    for (const char of guihuanCharacters) {
      entries.push({
        url: `${BASE_URL}/${locale}/guihuan/characters/${char.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    for (const weapon of guihuanWeapons) {
      entries.push({
        url: `${BASE_URL}/${locale}/guihuan/weapons/${weapon.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const mat of guihuanMaterials) {
      entries.push({
        url: `${BASE_URL}/${locale}/guihuan/items/${mat.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }

  return entries;
}
