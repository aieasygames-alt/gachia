/**
 * CRITICAL FIX: Unified game data access layer
 * This file provides type-safe, on-demand data loading to avoid
 * importing all game data at once, which severely impacts build performance.
 */

import type { GameId } from '@gachia/core';

/**
 * Get game data dynamically by game ID
 * This allows on-demand loading instead of importing all games at once
 */
export async function getGameData(gameId: GameId) {
  switch (gameId) {
    case 'genshin':
      return import('@gachia/data/games/genshin');
    case 'starrail':
      return import('@gachia/data/games/starrail');
    case 'wuwa':
      return import('@gachia/data/games/wuwa');
    case 'nte':
      return import('@gachia/data/games/nte');
    case 'zzz':
      return import('@gachia/data/games/zzz');
    case 'guihuan':
      return import('@gachia/data/games/guihuan');
    case 'ananta':
      return import('@gachia/data/games/ananta');
    case 'endfield':
      return import('@gachia/data/games/endfield');
    case 'sea':
      return import('@gachia/data/games/sea');
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
 * Get guides for a specific game
 */
export async function getGuides(gameId: GameId) {
  const gameData = await getGameData(gameId);
  return gameData.guides;
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