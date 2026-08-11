import type { GameId, SupportedLocale } from '@gachia/core';

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

export async function getCharacterListData(
  gameId: GameId,
  locale: SupportedLocale,
): Promise<CharacterListEntry[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/characters');
      return mod.genshinCharacters.map((character) => ({
        id: character.id,
        name: mod.getGenshinCharacterName(character, locale),
        image: toAbs(mod.getGenshinCharacterImage(character)),
        element: character.element,
        elementLabel: labelFromId(character.element),
        rarityLabel: `${character.rarity}★`,
        rankGroup: `${character.rarity}★`,
        subtitle: character.weaponType,
      }));
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/characters');
      return mod.starrailCharacters.map((character) => ({
        id: character.id,
        name: mod.getStarRailCharacterName(character, locale),
        image: toAbs(mod.getStarRailCharacterImage(character)),
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
      const mod = await import('@gachia/data/games/nte/characters');
      return mod.nteCharacters.map((character) => ({
        id: character.id,
        name: mod.getNteCharacterName(character, locale),
        image: toAbs(mod.getNteCharacterImage(character)),
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
    default:
      return [];
  }
}
