import type { SupportedLocale } from '@gachia/core';
import type { GenshinCharacter } from '@gachia/data/games/genshin/types';

export type TierCharacter = Pick<GenshinCharacter, 'id' | 'name' | 'nameEn' | 'nameJa' | 'element' | 'weaponType' | 'rarity' | 'tierRank'> & { image: string };
export type TierFilters = { query: string; element: string; weapon: string; rarity: string };
export type TierGroup = { tier: string | null; characters: TierCharacter[]; count: number; percentage: number };
export const tierOrder = ['SS', 'S+', 'S', 'A+', 'A', 'B', 'C'] as const;
export const emptyTierFilters = (): TierFilters => ({ query: '', element: 'all', weapon: 'all', rarity: 'all' });

export function projectTierCharacters(characters: GenshinCharacter[], image: (character: GenshinCharacter) => string): TierCharacter[] {
  return characters.map(character => {
    const { id, name, nameEn, nameJa, element, weaponType, rarity, tierRank } = character;
    return { id, name, nameEn, nameJa, element, weaponType, rarity, tierRank, image: image(character) };
  });
}

export const tierName = (character: TierCharacter, locale: SupportedLocale) => locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa || character.nameEn : character.nameEn;

export function filterTierCharacters(characters: TierCharacter[], filters: TierFilters) {
  const query = filters.query.trim().toLowerCase();
  return characters.filter(character => (filters.element === 'all' || character.element === filters.element)
    && (filters.weapon === 'all' || character.weaponType.toLowerCase() === filters.weapon.toLowerCase())
    && (filters.rarity === 'all' || String(character.rarity) === filters.rarity)
    && (!query || [character.id, character.name, character.nameEn, character.nameJa ?? ''].some(value => value.toLowerCase().includes(query))));
}

export function groupTierCharacters(characters: TierCharacter[]): TierGroup[] {
  const groups = new Map<string | null, TierCharacter[]>(tierOrder.map(tier => [tier, []]));
  for (const character of characters) {
    // Keep missing and unfamiliar ranks visible; neither implies a B rating.
    const tier = character.tierRank?.trim() || null;
    if (!groups.has(tier)) groups.set(tier, []);
    groups.get(tier)!.push(character);
  }
  return [...groups].map(([tier, entries]) => ({ tier, characters: entries, count: entries.length, percentage: characters.length ? entries.length / characters.length * 100 : 0 }));
}
