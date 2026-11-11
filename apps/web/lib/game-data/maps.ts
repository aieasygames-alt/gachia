import type { GameId, SupportedLocale } from '@gachia/core';
import type { WuWaSourceReview } from '@gachia/data/games/wuwa/types';

export interface MapRegionEntry {
  id: string;
  name: string;
  description: string;
  subRegions: string[];
  bosses: string[];
  specialties: string[];
  domains: string[];
  highlights: string[];
  tips: string[];
  spaceAnchors?: number;
  calyxes?: number;
  echoesOfWar?: number;
  sourceReview?: WuWaSourceReview;
}

export interface MapPageData {
  gameId: Extract<GameId, 'starrail' | 'wuwa' | 'nte' | 'endfield' | 'aniimo'>;
  regions: MapRegionEntry[];
}

export async function getMapPageData(gameId: GameId, locale: SupportedLocale): Promise<MapPageData | null> {
  switch (gameId) {
    case 'genshin': return null;
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/regions');
      return {
        gameId,
        regions: mod.regions.map((region) => ({
          id: region.id,
          name: mod.getRegionName(region, locale),
          description: mod.getRegionDescription(region, locale),
          // Do not expose previously hidden legacy scene lists as newly reviewed facts.
          subRegions: region.sourceReview ? mod.getRegionList(region, 'subRegions', locale) : [],
          bosses: region.bosses,
          specialties: region.specialties,
          domains: region.domains,
          highlights: mod.getRegionList(region, 'highlights', locale),
          tips: mod.getRegionList(region, 'tips', locale),
          sourceReview: region.sourceReview,
        })),
      };
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/regions');
      return {
        gameId,
        regions: mod.regions.map((region) => ({
          id: region.id,
          name: mod.getRegionName(region, locale),
          description: mod.getRegionDescription(region, locale),
          subRegions: [],
          bosses: region.bosses,
          specialties: region.specialties,
          domains: region.domains,
          highlights: region.highlights,
          tips: region.tips,
          spaceAnchors: region.spaceAnchors,
          calyxes: region.calyxes,
          echoesOfWar: region.echoesOfWar,
        })),
      };
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/regions');
      return {
        gameId,
        regions: mod.regions.map((region) => ({
          id: region.id,
          name: mod.getRegionName(region, locale),
          description: mod.getRegionDescription(region, locale),
          subRegions: region.subRegions,
          bosses: region.bosses,
          specialties: region.specialties,
          domains: region.domains,
          highlights: region.highlights,
          tips: region.tips,
        })),
      };
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/regions');
      return {
        gameId,
        regions: mod.regions.map((region) => ({
          id: region.id,
          name: mod.getRegionName(region, locale),
          description: mod.getRegionDescription(region, locale),
          subRegions: region.subRegions,
          bosses: region.bosses,
          specialties: region.specialties,
          domains: region.domains,
          highlights: region.highlights,
          tips: region.tips,
        })),
      };
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/regions');
      return {
        gameId,
        regions: mod.aniimoRegions.map((region) => ({
          id: region.id,
          name: mod.getAniimoRegionName(region, locale),
          description: mod.getAniimoRegionDescription(region, locale),
          subRegions: [],
          bosses: [],
          specialties: region.aniimo,
          domains: [],
          highlights: mod.getAniimoRegionMechanics(region, locale),
          tips: mod.getAniimoRegionTips(region, locale),
        })),
      };
    }
    default:
      return null;
  }
}
