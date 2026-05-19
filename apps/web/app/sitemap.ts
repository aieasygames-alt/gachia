import { GAMES, LOCALES } from '@gachia/core';
import {
  nteCharacters, nteGuides, nteWeapons, nteDiskSets,
  genshinCharacters, genshinGuides, genshinArtifactSets, genshinWeapons,
  wuwaCharacters, wuwaGuides, wuwaWeapons, wuwaEchoSets,
  starrailCharacters, starrailGuides, starrailRelicSets, starrailLightCones,
  zzzCharacters, zzzWeapons, zzzDriveDiscs, zzzMaterials,
  guihuanCharacters, guihuanWeapons, guihuanMaterials, guihuanGuides,
} from '@gachia/data';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gachia.com';

// Games with real content for each category
const CHAR_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan'] as const;
const WEAPON_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan'] as const;
const GUIDE_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan'] as const;
const ARTIFACT_GAMES = ['genshin', 'starrail'] as const;
const ECHO_GAMES = ['wuwa'] as const;
const DISK_SET_GAMES = ['nte'] as const;
const DRIVE_DISC_GAMES = ['zzz'] as const;

// Category routes that have real content per game
const REAL_CONTENT_ROUTES: Record<string, string[]> = {
  genshin: ['characters', 'weapons', 'items', 'tier-list', 'calculator', 'map', 'guides', 'artifacts', 'compare', 'teams'],
  starrail: ['characters', 'weapons', 'items', 'tier-list', 'calculator', 'map', 'guides', 'artifacts', 'compare', 'teams'],
  wuwa: ['characters', 'weapons', 'items', 'tier-list', 'map', 'guides', 'compare', 'teams'],
  nte: ['characters', 'weapons', 'items', 'tier-list', 'map', 'guides', 'disk-sets', 'redeem-codes', 'gacha', 'anomalies'],
  zzz: ['characters', 'weapons', 'items', 'tier-list', 'guides', 'drive-discs', 'build', 'compare', 'teams'],
  guihuan: ['characters', 'weapons', 'items', 'tier-list', 'guides', 'build', 'compare', 'teams'],
};

// Revalidate every 24 hours
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    // Home pages
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    });

    // Only include games with real content
    for (const [gameId, game] of Object.entries(GAMES)) {
      const realRoutes = REAL_CONTENT_ROUTES[gameId];
      if (!realRoutes) continue;

      // Game home page
      entries.push({
        url: `${BASE_URL}/${locale}/${gameId}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      // Category pages (only real content routes)
      for (const route of realRoutes) {
        if (!game.routes[route as keyof typeof game.routes]) continue;
        entries.push({
          url: `${BASE_URL}/${locale}/${gameId}/${route}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }

      // Character detail pages
      if (CHAR_GAMES.includes(gameId as typeof CHAR_GAMES[number])) {
        const chars = getCharactersForGame(gameId);
        for (const char of chars) {
          entries.push({
            url: `${BASE_URL}/${locale}/${gameId}/characters/${char.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }

      // Weapon detail pages
      if (WEAPON_GAMES.includes(gameId as typeof WEAPON_GAMES[number])) {
        const weapons = getWeaponsForGame(gameId);
        for (const weapon of weapons) {
          entries.push({
            url: `${BASE_URL}/${locale}/${gameId}/weapons/${weapon.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }

      // Guide detail pages
      if (GUIDE_GAMES.includes(gameId as typeof GUIDE_GAMES[number])) {
        const guides = getGuidesForGame(gameId);
        for (const guide of guides) {
          entries.push({
            url: `${BASE_URL}/${locale}/${gameId}/guides/${guide.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }

      // Artifact detail pages
      if (ARTIFACT_GAMES.includes(gameId as typeof ARTIFACT_GAMES[number])) {
        const sets = getArtifactsForGame(gameId);
        for (const set of sets) {
          entries.push({
            url: `${BASE_URL}/${locale}/${gameId}/artifacts/${set.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }

      // Echo detail pages
      if (ECHO_GAMES.includes(gameId as typeof ECHO_GAMES[number])) {
        for (const echo of wuwaEchoSets) {
          entries.push({
            url: `${BASE_URL}/${locale}/wuwa/echoes/${echo.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }

      // Disk set detail pages
      if (DISK_SET_GAMES.includes(gameId as typeof DISK_SET_GAMES[number])) {
        for (const ds of nteDiskSets) {
          entries.push({
            url: `${BASE_URL}/${locale}/nte/disk-sets/${ds.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }

      // Drive disc detail pages
      if (DRIVE_DISC_GAMES.includes(gameId as typeof DRIVE_DISC_GAMES[number])) {
        for (const dd of zzzDriveDiscs) {
          entries.push({
            url: `${BASE_URL}/${locale}/zzz/drive-discs/${dd.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  }

  return entries;
}

function getCharactersForGame(gameId: string) {
  switch (gameId) {
    case 'genshin': return genshinCharacters;
    case 'starrail': return starrailCharacters;
    case 'wuwa': return wuwaCharacters;
    case 'nte': return nteCharacters;
    case 'zzz': return zzzCharacters;
    default: return [];
  }
}

function getWeaponsForGame(gameId: string) {
  switch (gameId) {
    case 'genshin': return genshinWeapons;
    case 'starrail': return starrailLightCones;
    case 'wuwa': return wuwaWeapons;
    case 'nte': return nteWeapons;
    case 'zzz': return zzzWeapons;
    case 'guihuan': return guihuanWeapons;
    default: return [];
  }
}

function getGuidesForGame(gameId: string) {
  switch (gameId) {
    case 'genshin': return genshinGuides;
    case 'starrail': return starrailGuides;
    case 'wuwa': return wuwaGuides;
    case 'nte': return nteGuides;
    case 'guihuan': return guihuanGuides;
    default: return [];
  }
}

function getArtifactsForGame(gameId: string) {
  switch (gameId) {
    case 'genshin': return genshinArtifactSets;
    case 'starrail': return starrailRelicSets;
    default: return [];
  }
}
