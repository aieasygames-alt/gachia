import type { GameId, SupportedLocale } from '@gachia/core';

export interface SharedBuildCharacterEntry {
  id: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  element: string;
  rarity?: number;
}

export async function getSharedBuildCharacters(
  gameId: GameId,
  characterIds: string[],
  locale: SupportedLocale,
): Promise<SharedBuildCharacterEntry[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/characters');
      return characterIds.flatMap((id) => {
        const char = mod.genshinCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getGenshinCharacterName(char, locale), imageUrl: mod.getGenshinCharacterImage(char), imageAlt: char.nameEn, element: char.element, rarity: char.rarity }] : [];
      });
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/characters');
      return characterIds.flatMap((id) => {
        const char = mod.starrailCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getStarRailCharacterName(char, locale), imageUrl: mod.getStarRailCharacterImage(char), imageAlt: char.nameEn, element: char.element }] : [];
      });
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/characters');
      return characterIds.flatMap((id) => {
        const char = mod.wuwaCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getWuWaCharacterName(char, locale), imageUrl: mod.getWuWaCharacterImage(char), imageAlt: char.nameEn, element: char.element }] : [];
      });
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/characters');
      return characterIds.flatMap((id) => {
        const char = mod.nteCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getNteCharacterName(char, locale), imageUrl: mod.getNteCharacterImage(char), imageAlt: char.nameEn, element: char.attribute }] : [];
      });
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/characters');
      return characterIds.flatMap((id) => {
        const char = mod.zzzCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getZzzCharacterName(char, locale), imageUrl: mod.getZzzCharacterImage(char), imageAlt: char.nameEn, element: char.attribute }] : [];
      });
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/characters');
      return characterIds.flatMap((id) => {
        const char = mod.guihuanCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getGuihuanCharacterName(char, locale), imageUrl: mod.getGuihuanCharacterImage(char), imageAlt: char.nameEn, element: char.element }] : [];
      });
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/characters');
      return characterIds.flatMap((id) => {
        const char = mod.seaCharacters.find((character) => character.id === id);
        return char ? [{ id, name: mod.getSeaCharacterName(char, locale), imageUrl: mod.getSeaCharacterImage(char), imageAlt: char.nameEn, element: char.attribute }] : [];
      });
    }
    default:
      return [];
  }
}
