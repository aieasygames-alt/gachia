/**
 * CRITICAL FIX: Unified game data access layer
 * This file provides type-safe, on-demand data loading to avoid
 * importing all game data at once, which severely impacts build performance.
 */

import type { GameId } from '@gachia/core';

/**
 * Get game data by game ID
 */
export async function getGameData(gameId: GameId) {
  switch (gameId) {
    case 'genshin': {
      const { characters, weapons, items, tierLists } = await import('../games/genshin');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'starrail': {
      const { characters, weapons, items, tierLists } = await import('../games/starrail');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'wuwa': {
      const { characters, weapons, items, tierLists } = await import('../games/wuwa');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'nte': {
      const { characters, weapons, items, tierLists } = await import('../games/nte');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'zzz': {
      const { characters, weapons, items, tierLists } = await import('../games/zzz');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'hi3': {
      const { characters, weapons, items, tierLists } = await import('../games/hi3');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'guihuan': {
      const { characters, weapons, items, tierLists } = await import('../games/guihuan');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'ananta': {
      const { characters, weapons, items, tierLists } = await import('../games/ananta');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'endfield': {
      const { characters, weapons, items, tierLists } = await import('../games/endfield');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'sea': {
      const { characters, weapons, items, tierLists } = await import('../games/sea');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'skjh': {
      const { characters, weapons, items, tierLists } = await import('../games/skjh');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
    case 'aniimo': {
      const { characters, weapons, items, tierLists } = await import('../games/aniimo');
      return {
        characters,
        weapons,
        items,
        tierLists,
      };
    }
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
