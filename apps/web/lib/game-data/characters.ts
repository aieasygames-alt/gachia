import type { GameId, SupportedLocale } from '@gachia/core';
import { getCharacterIdsFromManifest } from './manifests';

export interface CharacterSummary {
  id: string;
  name: string;
  image: string;
}

export interface CharacterListEntry extends CharacterSummary {
  element: string;
  elementLabel: string;
  rarityLabel?: string;
  rankGroup: string;
  subtitle: string;
}

export interface CharacterMetaData {
  id: string;
  name: string;
  description: string;
  image: string;
  element: string;
  elementLabel: string;
  weaponLabel?: string;
  pathLabel?: string;
  specialtyLabel?: string;
  tierRank?: string;
}

function toAbs(path: string) {
  return path.startsWith('http') ? path : `https://gachia.com${path}`;
}

function labelFromId(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function getCharacterSummariesByIds(
  gameId: GameId,
  ids: string[],
  locale: SupportedLocale,
): Promise<CharacterSummary[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/character-summaries');
      return ids.flatMap((id) => {
        const character = mod.genshinCharacterSummaries.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getGenshinCharacterSummaryName(character, locale), image: toAbs(mod.getGenshinCharacterSummaryImage(character)) }] : [];
      });
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/character-summaries');
      return ids.flatMap((id) => {
        const character = mod.starrailCharacterSummaries.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getStarRailCharacterSummaryName(character, locale), image: toAbs(mod.getStarRailCharacterSummaryImage(character)) }] : [];
      });
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/characters');
      return ids.flatMap((id) => {
        const character = mod.wuwaCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getWuWaCharacterName(character, locale), image: toAbs(mod.getWuWaCharacterImage(character)) }] : [];
      });
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/character-summaries');
      return ids.flatMap((id) => {
        const character = mod.nteCharacterSummaries.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getNteCharacterSummaryName(character, locale), image: toAbs(mod.getNteCharacterSummaryImage(character)) }] : [];
      });
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/characters');
      return ids.flatMap((id) => {
        const character = mod.zzzCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getZzzCharacterName(character, locale), image: toAbs(mod.getZzzCharacterImage(character)) }] : [];
      });
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/characters');
      return ids.flatMap((id) => {
        const character = mod.guihuanCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getGuihuanCharacterName(character, locale), image: toAbs(mod.getGuihuanCharacterImage(character)) }] : [];
      });
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/characters');
      return ids.flatMap((id) => {
        const character = mod.anantaCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getAnantaCharacterName(character, locale), image: toAbs(mod.getAnantaCharacterImage(character)) }] : [];
      });
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/characters');
      return ids.flatMap((id) => {
        const character = mod.endfieldCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getEndfieldCharacterName(character, locale), image: toAbs(mod.getEndfieldCharacterImage(character)) }] : [];
      });
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/characters');
      return ids.flatMap((id) => {
        const character = mod.seaCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getSeaCharacterName(character, locale), image: toAbs(mod.getSeaCharacterImage(character)) }] : [];
      });
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/characters');
      return ids.flatMap((id) => {
        const character = mod.rocoCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getRocoCharacterName(character, locale), image: toAbs(mod.getRocoCharacterImage(character)) }] : [];
      });
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/character-summaries');
      return ids.flatMap((id) => {
        const character = mod.rocoCnCharacterSummaries.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getRocoCnCharacterSummaryName(character, locale), image: toAbs(mod.getRocoCnCharacterSummaryImage(character)) }] : [];
      });
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/characters');
      return ids.flatMap((id) => {
        const character = mod.getAniimoCharacterById(id);
        return character ? [{ id: character.id, name: mod.getAniimoCharacterName(character, locale), image: toAbs(mod.getAniimoCharacterImage(character)) }] : [];
      });
    }
    default:
      return [];
  }
}

export async function getCharactersForStaticParams(gameId: GameId): Promise<Array<{ id: string }>> {
  if (process.env.NODE_ENV !== 'production') return getCharacterIdsFromManifest(gameId);
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/character-summaries');
      return mod.genshinCharacterSummaries.map((character) => ({ id: character.id }));
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/character-summaries');
      return mod.starrailCharacterSummaries.map((character) => ({ id: character.id }));
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/characters');
      return mod.wuwaCharacters.map((character) => ({ id: character.id }));
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/character-summaries');
      return mod.nteCharacterSummaries.map((character) => ({ id: character.id }));
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/characters');
      return mod.zzzCharacters.map((character) => ({ id: character.id }));
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/characters');
      return mod.guihuanCharacters.map((character) => ({ id: character.id }));
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/characters');
      return mod.anantaCharacters.map((character) => ({ id: character.id }));
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/characters');
      return mod.endfieldCharacters.map((character) => ({ id: character.id }));
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/characters');
      return mod.seaCharacters.map((character) => ({ id: character.id }));
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/characters');
      return mod.rocoCharacters.map((character) => ({ id: character.id }));
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/character-summaries');
      return mod.rocoCnCharacterSummaries.map((character) => ({ id: character.id }));
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/characters');
      return mod.aniimoCharacters.map((character) => ({ id: character.id }));
    }
    default:
      return [];
  }
}

export async function getCharacterMetaData(
  gameId: GameId,
  id: string,
  locale: SupportedLocale,
): Promise<CharacterMetaData | null> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/characters');
      const character = mod.getGenshinCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getGenshinCharacterName(character, locale),
        description: mod.getGenshinCharacterDescription(character, locale),
        image: toAbs(mod.getGenshinCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        weaponLabel: character.weaponType,
        tierRank: character.tierRank,
      };
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/characters');
      const character = mod.getStarRailCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getStarRailCharacterName(character, locale),
        description: mod.getStarRailCharacterDescription(character, locale),
        image: toAbs(mod.getStarRailCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        pathLabel: character.path,
        tierRank: character.tierRank,
      };
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/characters');
      const character = mod.getWuWaCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getWuWaCharacterName(character, locale),
        description: mod.getWuWaCharacterDescription(character, locale),
        image: toAbs(mod.getWuWaCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        weaponLabel: character.weaponType,
        tierRank: character.tierRank,
      };
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/characters');
      const character = mod.getNteCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getNteCharacterName(character, locale),
        description: mod.getNteCharacterDescription(character, locale),
        image: toAbs(mod.getNteCharacterImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attribute),
        weaponLabel: character.weaponEn,
        tierRank: character.tierRank,
      };
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/characters');
      const character = mod.getZzzCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getZzzCharacterName(character, locale),
        description: mod.getZzzCharacterDescription(character, locale),
        image: toAbs(mod.getZzzCharacterImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attribute),
        specialtyLabel: character.specialtyEn,
        tierRank: character.tierRank,
      };
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/characters');
      const character = mod.getGuihuanCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getGuihuanCharacterName(character, locale),
        description: mod.getGuihuanCharacterDescription(character, locale),
        image: toAbs(mod.getGuihuanCharacterImage(character)),
        element: character.element,
        elementLabel: character.elementEn,
        tierRank: character.tierRank,
      };
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/characters');
      const character = mod.getAnantaCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getAnantaCharacterName(character, locale),
        description: mod.getAnantaCharacterDescription(character, locale),
        image: toAbs(mod.getAnantaCharacterImage(character)),
        element: character.element,
        elementLabel: character.elementEn,
        tierRank: character.tierRank,
      };
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/characters');
      const character = mod.getEndfieldCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getEndfieldCharacterName(character, locale),
        description: mod.getEndfieldCharacterDescription(character, locale),
        image: toAbs(mod.getEndfieldCharacterImage(character)),
        element: character.element,
        elementLabel: character.elementEn,
        tierRank: character.tierRank,
      };
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/characters');
      const character = mod.getSeaCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getSeaCharacterName(character, locale),
        description: mod.getSeaCharacterDescription(character, locale),
        image: toAbs(mod.getSeaCharacterImage(character)),
        element: character.attribute,
        elementLabel: character.attributeEn,
        tierRank: character.tierRank,
      };
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/characters');
      const character = mod.getRocoCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getRocoCharacterName(character, locale),
        description: mod.getRocoCharacterDescription(character, locale),
        image: toAbs(mod.getRocoCharacterImage(character)),
        element: character.attribute,
        elementLabel: character.attributeEn,
      };
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/characters');
      const character = mod.getRocoCnCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getRocoCnCharacterName(character, locale),
        description: mod.getRocoCnCharacterDescription(character, locale),
        image: toAbs(mod.getRocoCnCharacterImage(character)),
        element: character.attribute,
        elementLabel: character.attributeEn,
      };
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/characters');
      const character = mod.getAniimoCharacterById(id);
      if (!character) return null;
      return {
        id: character.id,
        name: mod.getAniimoCharacterName(character, locale),
        description: mod.getAniimoCharacterDescription(character, locale),
        image: toAbs(mod.getAniimoCharacterImage(character)),
        element: character.element,
        elementLabel: locale === 'zh' ? character.elementZh : locale === 'ja' ? character.elementJa : character.elementEn,
        weaponLabel: locale === 'zh' ? character.roleZh : locale === 'ja' ? character.roleJa : character.roleEn,
        pathLabel: character.stage,
        specialtyLabel: character.region,
        tierRank: character.tierRank,
      };
    }
    default:
      return null;
  }
}

export async function getCharacterListData(
  gameId: GameId,
  locale: SupportedLocale,
): Promise<CharacterListEntry[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/character-summaries');
      return mod.genshinCharacterSummaries.map((character) => ({
        id: character.id,
        name: mod.getGenshinCharacterSummaryName(character, locale),
        image: toAbs(mod.getGenshinCharacterSummaryImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.weaponType,
      }));
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/character-summaries');
      return mod.starrailCharacterSummaries.map((character) => ({
        id: character.id,
        name: mod.getStarRailCharacterSummaryName(character, locale),
        image: toAbs(mod.getStarRailCharacterSummaryImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.path,
      }));
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/characters');
      return mod.wuwaCharacters.map((character) => ({
        id: character.id,
        name: mod.getWuWaCharacterName(character, locale),
        image: toAbs(mod.getWuWaCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.weaponType,
      }));
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/character-summaries');
      return mod.nteCharacterSummaries.map((character) => ({
        id: character.id,
        name: mod.getNteCharacterSummaryName(character, locale),
        image: toAbs(mod.getNteCharacterSummaryImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attribute),
        rarityLabel: character.rank,
        rankGroup: character.rank,
        subtitle: character.roleEn,
      }));
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/characters');
      return mod.zzzCharacters.map((character) => ({
        id: character.id,
        name: mod.getZzzCharacterName(character, locale),
        image: toAbs(mod.getZzzCharacterImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attribute),
        rarityLabel: character.rank,
        rankGroup: character.rank,
        subtitle: character.specialtyEn,
      }));
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/characters');
      return mod.anantaCharacters.map((character) => ({
        id: character.id,
        name: mod.getAnantaCharacterName(character, locale),
        image: toAbs(mod.getAnantaCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        rarityLabel: character.rarity === 5 ? 'SSR' : character.rarity === 4 ? 'SR' : `${character.rarity}★`,
        rankGroup: character.rarity === 5 ? 'SSR' : character.rarity === 4 ? 'SR' : `${character.rarity}★`,
        subtitle: character.roleEn,
      }));
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/characters');
      return mod.guihuanCharacters.map((character) => ({
        id: character.id,
        name: mod.getGuihuanCharacterName(character, locale),
        image: toAbs(mod.getGuihuanCharacterImage(character)),
        element: character.element,
        elementLabel: character.elementEn,
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.roleEn,
      }));
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/characters');
      return mod.endfieldCharacters.map((character) => ({
        id: character.id,
        name: mod.getEndfieldCharacterName(character, locale),
        image: toAbs(mod.getEndfieldCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.professionEn,
      }));
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/characters');
      return mod.seaCharacters.map((character) => ({
        id: character.id,
        name: mod.getSeaCharacterName(character, locale),
        image: toAbs(mod.getSeaCharacterImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attribute),
        rankGroup: 'all',
        subtitle: character.roleEn,
      }));
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/characters');
      return mod.rocoCharacters.map((character) => ({
        id: character.id,
        name: mod.getRocoCharacterName(character, locale),
        image: toAbs(mod.getRocoCharacterImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attributeEn),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.attributeEn,
      }));
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/character-summaries');
      return mod.rocoCnCharacterSummaries.map((character) => ({
        id: character.id,
        name: mod.getRocoCnCharacterSummaryName(character, locale),
        image: toAbs(mod.getRocoCnCharacterSummaryImage(character)),
        element: character.attribute,
        elementLabel: labelFromId(character.attributeEn),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.attributeEn,
      }));
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/characters');
      return mod.aniimoCharacters.map((character) => ({
        id: character.id,
        name: mod.getAniimoCharacterName(character, locale),
        image: toAbs(mod.getAniimoCharacterImage(character)),
        element: character.element,
        elementLabel: locale === 'zh' ? character.elementZh : locale === 'ja' ? character.elementJa : character.elementEn,
        rarityLabel: character.stage.replace(' Stage', ''),
        rankGroup: character.stage,
        subtitle: locale === 'zh' ? character.roleZh : locale === 'ja' ? character.roleJa : character.roleEn,
      }));
    }
    default:
      return [];
  }
}
