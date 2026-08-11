import type { GameId, SupportedLocale } from '@gachia/core';
import type { GameMapData } from '@gachia/data/games/genshin/map-data';

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
}

export interface MapPageData {
  gameId: Extract<GameId, 'genshin' | 'starrail' | 'wuwa' | 'nte' | 'endfield'>;
  regions: MapRegionEntry[];
  mapData?: GameMapData;
}

export async function getMapPageData(gameId: GameId, locale: SupportedLocale): Promise<MapPageData | null> {
  switch (gameId) {
    case 'genshin': {
      const [regionsMod, mapMod] = await Promise.all([
        import('@gachia/data/games/genshin/regions'),
        import('@gachia/data/games/genshin/map-data'),
      ]);
      return {
        gameId,
        mapData: mapMod.genshinMapData,
        regions: regionsMod.regions.map((region) => ({
          id: region.id,
          name: regionsMod.getRegionName(region, locale),
          description: regionsMod.getRegionDescription(region, locale),
          subRegions: [],
          bosses: region.bosses,
          specialties: region.specialties,
          domains: region.domains,
          highlights: region.highlights,
          tips: region.tips,
        })),
      };
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/regions');
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
    default:
      return null;
  }
}
