import { GAMES, LOCALES } from '@gachia/core';
import type { MetadataRoute } from 'next';
import { getEntryUpdatedAt, hasLocalizedContent } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

// Games with real content for each category
const CHAR_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'roco', 'roco-cn', 'aniimo'] as const;
const WEAPON_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh'] as const;
const GUIDE_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh', 'roco', 'roco-cn', 'aniimo'] as const;
const ARTIFACT_GAMES = ['genshin', 'starrail'] as const;
const ECHO_GAMES = ['wuwa'] as const;
const DISK_SET_GAMES = ['nte'] as const;
const DRIVE_DISC_GAMES = ['zzz'] as const;
const ITEM_GAMES = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh', 'roco-cn'] as const;
const STATIC_SITE_PAGES = ['about', 'contact', 'privacy', 'terms', 'sitemap', 'calendar', 'tools/pull-planner'] as const;

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
  roco: ['characters', 'guides', 'weapons', 'tier-list', 'version', 'download', 'redeem-codes', 'type-chart', 'merchant'],
  'roco-cn': ['characters', 'guides', 'items', 'weapons', 'tier-list', 'version', 'download', 'redeem-codes', 'type-chart', 'merchant'],
  aniimo: ['characters', 'guides', 'map', 'version', 'download', 'redeem-codes'],
};

type SitemapItem = { id: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
        const chars = await getCharactersForGame(gameId);
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
        const weapons = await getWeaponsForGame(gameId);
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
        const guides = await getGuidesForGame(gameId);
        for (const guide of guides) {
          if (!hasLocalizedContent(guide, locale)) continue;
          const guideHints = getGuideSitemapHints(guide);

          entries.push({
            url: `${BASE_URL}/${locale}/${gameId}/guides/${guide.id}`,
            changeFrequency: guideHints.changeFrequency,
            priority: guideHints.priority,
            lastModified: getEntryUpdatedAt(guide),
          });
        }
      }

      // Artifact detail pages
      if (ARTIFACT_GAMES.includes(gameId as typeof ARTIFACT_GAMES[number])) {
        const sets = await getArtifactsForGame(gameId);
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
        const wuwaEchoSets = await getEchoesForGame(gameId);
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
        const nteDiskSets = await getDiskSetsForGame(gameId);
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
        const zzzDriveDiscs = await getDriveDiscsForGame(gameId);
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
        const items = await getItemsForGame(gameId);
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

function getGuideSitemapHints(entry: unknown): Pick<MetadataRoute.Sitemap[number], 'changeFrequency' | 'priority'> {
  if (!entry || typeof entry !== 'object') return { changeFrequency: 'weekly', priority: 0.7 };
  const guide = entry as { id?: unknown; category?: unknown; updatedAt?: unknown };
  const id = typeof guide.id === 'string' ? guide.id : '';
  const category = typeof guide.category === 'string' ? guide.category : '';
  const updatedAt = typeof guide.updatedAt === 'string' ? guide.updatedAt : '';
  const isFreshIntent =
    category === 'banner' ||
    category === 'version' ||
    id.includes('banner') ||
    id.includes('version') ||
    id.includes('download') ||
    id.includes('launch') ||
    id.includes('redeem-code');

  if (isFreshIntent && updatedAt) return { changeFrequency: 'daily', priority: 0.8 };
  return { changeFrequency: 'weekly', priority: 0.7 };
}

async function getCharactersForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'genshin': return (await import('@gachia/data/games/genshin/character-summaries')).genshinCharacterSummaries;
    case 'starrail': return (await import('@gachia/data/games/starrail/character-summaries')).starrailCharacterSummaries;
    case 'wuwa': return (await import('@gachia/data/games/wuwa/characters')).wuwaCharacters;
    case 'nte': return (await import('@gachia/data/games/nte/character-summaries')).nteCharacterSummaries;
    case 'zzz': return (await import('@gachia/data/games/zzz/characters')).zzzCharacters;
    case 'guihuan': return (await import('@gachia/data/games/guihuan/characters')).guihuanCharacters;
    case 'ananta': return (await import('@gachia/data/games/ananta/characters')).anantaCharacters;
    case 'endfield': return (await import('@gachia/data/games/endfield/characters')).endfieldCharacters;
    case 'sea': return (await import('@gachia/data/games/sea/characters')).seaCharacters;
    case 'roco': return (await import('@gachia/data/games/roco/characters')).rocoCharacters;
    case 'roco-cn': return (await import('@gachia/data/games/roco-cn/character-summaries')).rocoCnCharacterSummaries;
    case 'aniimo': return (await import('@gachia/data/games/aniimo/characters')).aniimoCharacters;
    default: return [];
  }
}

async function getWeaponsForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'genshin': return (await import('@gachia/data/games/genshin/weapons')).genshinWeapons;
    case 'starrail': return (await import('@gachia/data/games/starrail/weapons')).starrailLightCones;
    case 'wuwa': return (await import('@gachia/data/games/wuwa/weapons')).wuwaWeapons;
    case 'nte': return (await import('@gachia/data/games/nte/weapons')).nteWeapons;
    case 'zzz': return (await import('@gachia/data/games/zzz/weapons')).zzzWeapons;
    case 'guihuan': return (await import('@gachia/data/games/guihuan/weapons')).guihuanWeapons;
    case 'ananta': return (await import('@gachia/data/games/ananta/weapons')).anantaWeapons;
    case 'endfield': return (await import('@gachia/data/games/endfield/weapons')).endfieldWeapons;
    case 'sea': return (await import('@gachia/data/games/sea/weapons')).seaWeapons;
    case 'skjh': return (await import('@gachia/data/games/skjh/weapons')).skjhWeapons;
    default: return [];
  }
}

async function getGuidesForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'genshin': return (await import('@gachia/data/games/genshin/guides')).genshinGuides;
    case 'starrail': return (await import('@gachia/data/games/starrail/guides')).starrailGuides;
    case 'wuwa': return (await import('@gachia/data/games/wuwa/guides')).wuwaGuides;
    case 'nte': return (await import('@gachia/data/games/nte/guides')).guides;
    case 'zzz': return (await import('@gachia/data/games/zzz/guides')).zzzGuides;
    case 'guihuan': return (await import('@gachia/data/games/guihuan/guides')).guihuanGuides;
    case 'ananta': return (await import('@gachia/data/games/ananta/guides')).anantaGuides;
    case 'endfield': return (await import('@gachia/data/games/endfield/guides')).endfieldGuides;
    case 'sea': return (await import('@gachia/data/games/sea/guides')).seaGuides;
    case 'skjh': return (await import('@gachia/data/games/skjh/guides')).skjhGuides;
    case 'roco': return (await import('@gachia/data/games/roco/guides')).rocoGuides;
    case 'roco-cn': return (await import('@gachia/data/games/roco-cn/guides')).rocoCnGuides;
    case 'aniimo': return (await import('@gachia/data/games/aniimo/guides')).aniimoGuides;
    default: return [];
  }
}

async function getArtifactsForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'genshin': return (await import('@gachia/data/games/genshin/artifacts')).artifactSets;
    case 'starrail': return (await import('@gachia/data/games/starrail/relics')).relicSets;
    default: return [];
  }
}

async function getEchoesForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'wuwa': return (await import('@gachia/data/games/wuwa/echoes')).echoSets;
    default: return [];
  }
}

async function getDiskSetsForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'nte': return (await import('@gachia/data/games/nte/extras')).diskSets;
    default: return [];
  }
}

async function getDriveDiscsForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'zzz': return (await import('@gachia/data/games/zzz/drive-discs')).zzzDriveDiscs;
    default: return [];
  }
}

async function getItemsForGame(gameId: string): Promise<SitemapItem[]> {
  switch (gameId) {
    case 'genshin': return (await import('@gachia/data/games/genshin/items')).genshinMaterials;
    case 'starrail': return (await import('@gachia/data/games/starrail/items')).starrailMaterials;
    case 'wuwa': return (await import('@gachia/data/games/wuwa/items')).wuwaMaterials;
    case 'nte': return (await import('@gachia/data/games/nte/items')).nteMaterials;
    case 'zzz': return (await import('@gachia/data/games/zzz/items')).zzzMaterials;
    case 'guihuan': return (await import('@gachia/data/games/guihuan/items')).guihuanMaterials;
    case 'ananta': return (await import('@gachia/data/games/ananta/items')).anantaMaterials;
    case 'endfield': return (await import('@gachia/data/games/endfield/items')).endfieldMaterials;
    case 'sea': return (await import('@gachia/data/games/sea/items')).seaMaterials;
    case 'skjh': return (await import('@gachia/data/games/skjh/items')).skjhMaterials;
    case 'roco': return (await import('@gachia/data/games/roco/items')).rocoMaterials;
    case 'roco-cn': return (await import('@gachia/data/games/roco-cn/items')).rocoCnMaterials;
    default: return [];
  }
}
