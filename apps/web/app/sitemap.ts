import { GAMES, LOCALES } from '@gachia/core';
// Characters
import { genshinCharacters } from '@gachia/data/games/genshin/characters';
import { starrailCharacters } from '@gachia/data/games/starrail/characters';
import { wuwaCharacters } from '@gachia/data/games/wuwa/characters';
import { nteCharacters } from '@gachia/data/games/nte/characters';
import { zzzCharacters } from '@gachia/data/games/zzz/characters';
import { guihuanCharacters } from '@gachia/data/games/guihuan/characters';
import { anantaCharacters } from '@gachia/data/games/ananta/characters';
import { endfieldCharacters } from '@gachia/data/games/endfield/characters';
import { seaCharacters } from '@gachia/data/games/sea/characters';

// Weapons
import { genshinWeapons } from '@gachia/data/games/genshin/weapons';
import { starrailLightCones } from '@gachia/data/games/starrail/weapons';
import { wuwaWeapons } from '@gachia/data/games/wuwa/weapons';
import { nteWeapons } from '@gachia/data/games/nte/weapons';
import { zzzWeapons } from '@gachia/data/games/zzz/weapons';
import { guihuanWeapons } from '@gachia/data/games/guihuan/weapons';
import { anantaWeapons } from '@gachia/data/games/ananta/weapons';
import { endfieldWeapons } from '@gachia/data/games/endfield/weapons';
import { seaWeapons } from '@gachia/data/games/sea/weapons';
import { skjhWeapons } from '@gachia/data/games/skjh/weapons';

// Guides
import { genshinGuides } from '@gachia/data/games/genshin/guides';
import { starrailGuides } from '@gachia/data/games/starrail/guides';
import { wuwaGuides } from '@gachia/data/games/wuwa/guides';
import { guides as nteGuides } from '@gachia/data/games/nte/guides';
import { zzzGuides } from '@gachia/data/games/zzz/guides';
import { guihuanGuides } from '@gachia/data/games/guihuan/guides';
import { anantaGuides } from '@gachia/data/games/ananta/guides';
import { endfieldGuides } from '@gachia/data/games/endfield/guides';
import { seaGuides } from '@gachia/data/games/sea/guides';
import { skjhGuides } from '@gachia/data/games/skjh/guides';

// Materials / Items
import { genshinMaterials } from '@gachia/data/games/genshin/items';
import { starrailMaterials } from '@gachia/data/games/starrail/items';
import { wuwaMaterials } from '@gachia/data/games/wuwa/items';
import { nteMaterials } from '@gachia/data/games/nte/items';
import { zzzMaterials } from '@gachia/data/games/zzz/items';
import { guihuanMaterials } from '@gachia/data/games/guihuan/items';
import { anantaMaterials } from '@gachia/data/games/ananta/items';
import { endfieldMaterials } from '@gachia/data/games/endfield/items';
import { seaMaterials } from '@gachia/data/games/sea/items';
import { skjhMaterials } from '@gachia/data/games/skjh/items';

// Game-specific gear
import { artifactSets as genshinArtifactSets } from '@gachia/data/games/genshin/artifacts';
import { relicSets as starrailRelicSets } from '@gachia/data/games/starrail/relics';
import { echoSets as wuwaEchoSets } from '@gachia/data/games/wuwa/echoes';
import { diskSets as nteDiskSets } from '@gachia/data/games/nte/extras';
import { zzzDriveDiscs } from '@gachia/data/games/zzz/drive-discs';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gachia.com';

// Games with real content for each category
const CHAR_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea'] as const;
const WEAPON_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh'] as const;
const GUIDE_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh'] as const;
const ARTIFACT_GAMES = ['genshin', 'starrail'] as const;
const ECHO_GAMES = ['wuwa'] as const;
const DISK_SET_GAMES = ['nte'] as const;
const DRIVE_DISC_GAMES = ['zzz'] as const;
const ITEM_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh'] as const;
const STATIC_SITE_PAGES = ['contact', 'privacy', 'terms', 'sitemap'] as const;

// Category routes that have real content per game
const REAL_CONTENT_ROUTES: Record<string, string[]> = {
  genshin: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'calculator', 'map', 'guides', 'artifacts', 'compare', 'teams'],
  starrail: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'calculator', 'map', 'guides', 'artifacts', 'compare', 'teams'],
  wuwa: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'map', 'guides', 'compare', 'teams'],
  nte: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'map', 'guides', 'disk-sets', 'redeem-codes', 'gacha', 'anomalies'],
  zzz: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'guides', 'drive-discs', 'build', 'compare', 'teams', 'redeem-codes'],
  guihuan: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'guides', 'build', 'compare', 'teams'],
  ananta: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'guides'],
  endfield: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'guides', 'build', 'compare', 'teams', 'map'],
  sea: ['characters', 'guides', 'items', 'tier-list', 'version', 'download', 'calculator', 'redeem-codes'],
  skjh: ['weapons', 'guides', 'items', 'redeem-codes', 'version', 'download', 'calculator', 'teams', 'map'],
};

// Revalidate every 24 hours
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    // Home pages
    entries.push({
      url: `${BASE_URL}/${locale}`,
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
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      // Category pages (only real content routes)
      for (const route of realRoutes) {
        if (!game.routes[route as keyof typeof game.routes]) continue;
        entries.push({
          url: `${BASE_URL}/${locale}/${gameId}/${route}`,
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
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }

      // Item / Material detail pages
      if (ITEM_GAMES.includes(gameId as typeof ITEM_GAMES[number])) {
        const items = getItemsForGame(gameId);
        for (const item of items) {
          entries.push({
            url: `${BASE_URL}/${locale}/${gameId}/items/${item.id}`,
            changeFrequency: 'weekly',
            priority: 0.5,
          });
        }
      }
    }

    for (const page of STATIC_SITE_PAGES) {
      entries.push({
        url: `${BASE_URL}/${locale}/${page}`,
        changeFrequency: 'monthly',
        priority: page === 'sitemap' ? 0.3 : 0.4,
      });
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
    case 'guihuan': return guihuanCharacters;
    case 'ananta': return anantaCharacters;
    case 'endfield': return endfieldCharacters;
    case 'sea': return seaCharacters;
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
    case 'ananta': return anantaWeapons;
    case 'endfield': return endfieldWeapons;
    case 'sea': return seaWeapons;
    case 'skjh': return skjhWeapons;
    default: return [];
  }
}

function getGuidesForGame(gameId: string) {
  switch (gameId) {
    case 'genshin': return genshinGuides;
    case 'starrail': return starrailGuides;
    case 'wuwa': return wuwaGuides;
    case 'nte': return nteGuides;
    case 'zzz': return zzzGuides;
    case 'guihuan': return guihuanGuides;
    case 'ananta': return anantaGuides;
    case 'endfield': return endfieldGuides;
    case 'sea': return seaGuides;
    case 'skjh': return skjhGuides;
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

function getItemsForGame(gameId: string) {
  switch (gameId) {
    case 'genshin': return genshinMaterials;
    case 'starrail': return starrailMaterials;
    case 'wuwa': return wuwaMaterials;
    case 'nte': return nteMaterials;
    case 'zzz': return zzzMaterials;
    case 'guihuan': return guihuanMaterials;
    case 'ananta': return anantaMaterials;
    case 'endfield': return endfieldMaterials;
    case 'sea': return seaMaterials;
    case 'skjh': return skjhMaterials;
    default: return [];
  }
}
