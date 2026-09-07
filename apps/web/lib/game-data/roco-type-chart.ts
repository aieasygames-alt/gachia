import { GAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';

export type RocoTypeChartGameId = Extract<GameId, 'roco' | 'roco-cn'>;

export type TypeEffectiveness = 0.5 | 1 | 2;

export interface RocoTypeMatchup {
  attack: string;
  defense: string;
  multiplier: TypeEffectiveness;
}

const SUPER_EFFECTIVE: Record<string, string[]> = {
  grass: ['water', 'ground'],
  fire: ['grass', 'ice', 'bug'],
  water: ['fire', 'ground'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying'],
  poison: ['grass'],
  ground: ['fire', 'electric', 'poison'],
  flying: ['grass', 'bug'],
  bug: ['grass', 'dark'],
  light: ['dark'],
  dark: ['light'],
};

const RESISTED: Record<string, string[]> = {
  grass: ['fire', 'grass', 'poison', 'flying', 'bug'],
  fire: ['water', 'fire'],
  water: ['grass', 'water'],
  electric: ['grass', 'electric', 'ground'],
  normal: ['ghost'],
  ice: ['fire', 'water', 'ice'],
  poison: ['poison', 'ground'],
  ground: ['grass', 'bug'],
  flying: ['electric'],
  bug: ['fire', 'flying', 'poison'],
  light: ['light'],
  dark: ['dark'],
};

export function getRocoTypeElements(gameId: RocoTypeChartGameId) {
  return GAMES[gameId].elements;
}

export function getRocoTypeMatchups(gameId: RocoTypeChartGameId): RocoTypeMatchup[] {
  const elementIds = getRocoTypeElements(gameId).map((element) => element.id);
  return elementIds.flatMap((attack) =>
    elementIds.map((defense) => ({
      attack,
      defense,
      multiplier: getTypeMultiplier(attack, defense),
    })),
  );
}

export function getTypeMultiplier(attack: string, defense: string): TypeEffectiveness {
  if (SUPER_EFFECTIVE[attack]?.includes(defense)) return 2;
  if (RESISTED[attack]?.includes(defense)) return 0.5;
  return 1;
}

export function getEffectivenessLabel(multiplier: TypeEffectiveness, locale: SupportedLocale): string {
  if (multiplier === 2) {
    return locale === 'zh' ? '克制' : locale === 'ja' ? '有利' : 'Strong';
  }
  if (multiplier === 0.5) {
    return locale === 'zh' ? '被抵抗' : locale === 'ja' ? '軽減' : 'Resisted';
  }
  return locale === 'zh' ? '普通' : locale === 'ja' ? '通常' : 'Normal';
}

export function isRocoTypeChartGame(gameId: GameId): gameId is RocoTypeChartGameId {
  return gameId === 'roco' || gameId === 'roco-cn';
}
