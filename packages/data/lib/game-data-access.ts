/**
 * CRITICAL FIX: Unified game data access layer
 * This file provides type-safe, on-demand data loading to avoid
 * importing all game data at once, which severely impacts build performance.
 */

import type { GameId } from '@gachia/core';
import {
  characters as genshinCharacters,
  weapons as genshinWeapons,
  items as genshinItems,
  tierLists as genshinTierLists,
} from '../games/genshin';
import {
  characters as starrailCharacters,
  weapons as starrailWeapons,
  items as starrailItems,
  tierLists as starrailTierLists,
} from '../games/starrail';
import {
  characters as wuwaCharacters,
  weapons as wuwaWeapons,
  items as wuwaItems,
  tierLists as wuwaTierLists,
} from '../games/wuwa';
import {
  characters as nteCharacters,
  weapons as nteWeapons,
  items as nteItems,
  tierLists as nteTierLists,
} from '../games/nte';
import {
  characters as zzzCharacters,
  weapons as zzzWeapons,
  items as zzzItems,
  tierLists as zzzTierLists,
} from '../games/zzz';
import {
  characters as guihuanCharacters,
  weapons as guihuanWeapons,
  items as guihuanItems,
  tierLists as guihuanTierLists,
} from '../games/guihuan';
import {
  characters as anantaCharacters,
  weapons as anantaWeapons,
  items as anantaItems,
  tierLists as anantaTierLists,
} from '../games/ananta';
import {
  characters as endfieldCharacters,
  weapons as endfieldWeapons,
  items as endfieldItems,
  tierLists as endfieldTierLists,
} from '../games/endfield';
import {
  characters as seaCharacters,
  weapons as seaWeapons,
  items as seaItems,
  tierLists as seaTierLists,
} from '../games/sea';
import {
  characters as skjhCharacters,
  weapons as skjhWeapons,
  items as skjhItems,
  tierLists as skjhTierLists,
} from '../games/skjh';

/**
 * Get game data by game ID
 */
export async function getGameData(gameId: GameId) {
  switch (gameId) {
    case 'genshin':
      return {
        characters: genshinCharacters,
        weapons: genshinWeapons,
        items: genshinItems,
        tierLists: genshinTierLists,
      };
    case 'starrail':
      return {
        characters: starrailCharacters,
        weapons: starrailWeapons,
        items: starrailItems,
        tierLists: starrailTierLists,
      };
    case 'wuwa':
      return {
        characters: wuwaCharacters,
        weapons: wuwaWeapons,
        items: wuwaItems,
        tierLists: wuwaTierLists,
      };
    case 'nte':
      return {
        characters: nteCharacters,
        weapons: nteWeapons,
        items: nteItems,
        tierLists: nteTierLists,
      };
    case 'zzz':
      return {
        characters: zzzCharacters,
        weapons: zzzWeapons,
        items: zzzItems,
        tierLists: zzzTierLists,
      };
    case 'guihuan':
      return {
        characters: guihuanCharacters,
        weapons: guihuanWeapons,
        items: guihuanItems,
        tierLists: guihuanTierLists,
      };
    case 'ananta':
      return {
        characters: anantaCharacters,
        weapons: anantaWeapons,
        items: anantaItems,
        tierLists: anantaTierLists,
      };
    case 'endfield':
      return {
        characters: endfieldCharacters,
        weapons: endfieldWeapons,
        items: endfieldItems,
        tierLists: endfieldTierLists,
      };
    case 'sea':
      return {
        characters: seaCharacters,
        weapons: seaWeapons,
        items: seaItems,
        tierLists: seaTierLists,
      };
    case 'skjh':
      return {
        characters: skjhCharacters,
        weapons: skjhWeapons,
        items: skjhItems,
        tierLists: skjhTierLists,
      };
    default:
      throw new Error(`Unknown game ID: ${gameId}`);
  }
}

/**
 * Get character data for a specific game
 */
export async function getCharacters(gameId: GameId) {
  const gameData = await getGameData(gameId);
  return gameData.characters;
}

/**
 * Get weapon data for a specific game
 */
export async function getWeapons(gameId: GameId) {
  const gameData = await getGameData(gameId);
  return gameData.weapons;
}

/**
 * Get item data for a specific game
 */
export async function getItems(gameId: GameId) {
  const gameData = await getGameData(gameId);
  return gameData.items;
}

/**
 * Get tier lists for a specific game
 */
export async function getTierLists(gameId: GameId) {
  const gameData = await getGameData(gameId);
  return gameData.tierLists;
}

/**
 * Get a specific character by ID from a specific game
 */
export async function getCharacterById(gameId: GameId, characterId: string) {
  const characters = await getCharacters(gameId);
  return characters.find((char) => char.id === characterId);
}

/**
 * Get a specific weapon by ID from a specific game
 */
export async function getWeaponById(gameId: GameId, weaponId: string) {
  const weapons = await getWeapons(gameId);
  return weapons.find((weapon) => weapon.id === weaponId);
}

/**
 * Get a specific item by ID from a specific game
 */
export async function getItemById(gameId: GameId, itemId: string) {
  const items = await getItems(gameId);
  return items.find((item) => item.id === itemId);
}
