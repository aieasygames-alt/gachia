import type { GameId, SupportedLocale } from '@gachia/core';

export interface CharacterSummary {
  id: string;
  name: string;
  image: string;
}

function toAbs(path: string) {
  return path.startsWith('http') ? path : `https://gachia.com${path}`;
}

export async function getCharacterSummariesByIds(
  gameId: GameId,
  ids: string[],
  locale: SupportedLocale,
): Promise<CharacterSummary[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/characters');
      return ids.flatMap((id) => {
        const character = mod.genshinCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getGenshinCharacterName(character, locale), image: toAbs(mod.getGenshinCharacterImage(character)) }] : [];
      });
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/characters');
      return ids.flatMap((id) => {
        const character = mod.starrailCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getStarRailCharacterName(character, locale), image: toAbs(mod.getStarRailCharacterImage(character)) }] : [];
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
      const mod = await import('@gachia/data/games/nte/characters');
      return ids.flatMap((id) => {
        const character = mod.nteCharacters.find((entry) => entry.id === id);
        return character ? [{ id: character.id, name: mod.getNteCharacterName(character, locale), image: toAbs(mod.getNteCharacterImage(character)) }] : [];
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
    default:
      return [];
  }
}
