import type { GameId, SupportedLocale } from '@gachia/core';

export interface TierCharacterEntry {
  id: string;
  name: string;
  href: string;
  imageUrl: string;
  element: string;
  role: string;
}

export interface TierListGroup {
  tier: string;
  characters: TierCharacterEntry[];
}

const TIER_ORDER_WITH_PLUS = ['SS', 'S+', 'S', 'A+', 'A', 'B', 'C'];
const TIER_ORDER = ['SS', 'S', 'A', 'B', 'C'];

function groupByTier<T>(characters: T[], getTier: (character: T) => string | undefined, order: string[]) {
  const groups: Record<string, T[]> = {};
  for (const character of characters) {
    const tier = getTier(character) ?? 'B';
    if (!groups[tier]) groups[tier] = [];
    groups[tier]!.push(character);
  }
  return order.map((tier) => ({ tier, characters: groups[tier] ?? [] })).filter((group) => group.characters.length > 0);
}

function idsByTier(entries: Array<{ tier: string; characterId: string }>, order: string[]) {
  const groups: Record<string, string[]> = {};
  for (const entry of entries) {
    if (!groups[entry.tier]) groups[entry.tier] = [];
    groups[entry.tier]!.push(entry.characterId);
  }
  return order.map((tier) => ({ tier, ids: groups[tier] ?? [] })).filter((group) => group.ids.length > 0);
}

export async function getTierListGroups(gameId: GameId, locale: SupportedLocale): Promise<TierListGroup[]> {
  switch (gameId) {
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/character-summaries');
      return groupByTier(mod.nteCharacterSummaries, (char) => char.tierRank, ['SS', 'S+', 'A+', 'A', 'B']).map((group) => ({
        tier: group.tier,
        characters: group.characters.map((char) => ({
          id: char.id,
          name: mod.getNteCharacterSummaryName(char, locale),
          href: `/nte/characters/${char.id}`,
          imageUrl: mod.getNteCharacterSummaryImage(char),
          element: char.attribute,
          role: char.roleEn,
        })),
      }));
    }
    case 'zzz': {
      const [{ zzzCharacters, getZzzCharacterImage, getZzzCharacterName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/zzz/characters'),
        import('@gachia/data/games/zzz/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'zzz' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'zzz' && tl.category === 'overall');
      const charMap = new Map(zzzCharacters.map((char) => [char.id, char]));
      return idsByTier(tierData?.entries ?? [], TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          return [{ id: char.id, name: getZzzCharacterName(char, locale), href: `/zzz/characters/${char.id}`, imageUrl: getZzzCharacterImage(char), element: char.attribute, role: char.specialtyEn }];
        }),
      }));
    }
    case 'ananta': {
      const [{ anantaCharacters, getAnantaCharacterImage, getAnantaCharacterName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/ananta/characters'),
        import('@gachia/data/games/ananta/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'ananta' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'ananta' && tl.category === 'overall');
      const charMap = new Map(anantaCharacters.map((char) => [char.id, char]));
      return idsByTier(tierData?.entries ?? [], TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          return [{ id: char.id, name: getAnantaCharacterName(char, locale), href: `/ananta/characters/${char.id}`, imageUrl: getAnantaCharacterImage(char), element: char.element, role: char.roleEn }];
        }),
      }));
    }
    case 'guihuan': {
      const [{ guihuanCharacters, getGuihuanCharacterImage, getGuihuanCharacterName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/guihuan/characters'),
        import('@gachia/data/games/guihuan/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'guihuan' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'guihuan' && tl.category === 'overall');
      const charMap = new Map(guihuanCharacters.map((char) => [char.id, char]));
      return idsByTier(tierData?.entries ?? [], TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          return [{ id: char.id, name: getGuihuanCharacterName(char, locale), href: `/guihuan/characters/${char.id}`, imageUrl: getGuihuanCharacterImage(char), element: char.element, role: char.roleEn }];
        }),
      }));
    }
    case 'endfield': {
      const [{ endfieldCharacters, getEndfieldCharacterImage, getEndfieldCharacterName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/endfield/characters'),
        import('@gachia/data/games/endfield/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'endfield' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'endfield' && tl.category === 'overall');
      const charMap = new Map(endfieldCharacters.map((char) => [char.id, char]));
      return idsByTier(tierData?.entries ?? [], TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          return [{ id: char.id, name: getEndfieldCharacterName(char, locale), href: `/endfield/characters/${char.id}`, imageUrl: getEndfieldCharacterImage(char), element: char.element, role: char.professionEn }];
        }),
      }));
    }
    case 'sea': {
      const [{ seaCharacters, getSeaCharacterImage, getSeaCharacterName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/sea/characters'),
        import('@gachia/data/games/sea/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'sea' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'sea' && tl.category === 'overall');
      const charMap = new Map(seaCharacters.map((char) => [char.id, char]));
      return idsByTier(tierData?.entries ?? [], TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          return [{ id: char.id, name: getSeaCharacterName(char, locale), href: `/sea/characters/${char.id}`, imageUrl: getSeaCharacterImage(char), element: char.attribute, role: char.roleEn }];
        }),
      }));
    }
    case 'roco-cn': {
      const [{ rocoCnCharacterSummaries, getRocoCnCharacterSummaryImage, getRocoCnCharacterSummaryName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/roco-cn/character-summaries'),
        import('@gachia/data/games/roco-cn/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'roco-cn' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'roco-cn' && tl.category === 'overall');
      const entries = tierData?.entries ?? [];
      const charMap = new Map(rocoCnCharacterSummaries.map((char) => [char.id, char]));
      return idsByTier(entries, TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          const entry = entries.find((e) => e.characterId === id);
          return [{ id: char.id, name: getRocoCnCharacterSummaryName(char, locale), href: `/roco-cn/characters/${char.id}`, imageUrl: getRocoCnCharacterSummaryImage(char), element: char.attribute, role: entry?.role ?? char.attributeEn }];
        }),
      }));
    }
    case 'roco': {
      const [{ rocoCharacters, getRocoCharacterImage, getRocoCharacterName }, { tierLists }] = await Promise.all([
        import('@gachia/data/games/roco/characters'),
        import('@gachia/data/games/roco/tier-lists'),
      ]);
      const tierData = tierLists.find((tl) => tl.gameId === 'roco' && tl.category === 'overall' && tl.locale === locale)
        ?? tierLists.find((tl) => tl.gameId === 'roco' && tl.category === 'overall');
      const entries = tierData?.entries ?? [];
      const charMap = new Map(rocoCharacters.map((char) => [char.id, char]));
      return idsByTier(entries, TIER_ORDER).map((group) => ({
        tier: group.tier,
        characters: group.ids.flatMap((id) => {
          const char = charMap.get(id);
          if (!char) return [];
          const entry = entries.find((e) => e.characterId === id);
          return [{ id: char.id, name: getRocoCharacterName(char, locale), href: `/roco/characters/${char.id}`, imageUrl: getRocoCharacterImage(char), element: char.attribute, role: entry?.role ?? char.attributeEn }];
        }),
      }));
    }
    default:
      return [];
  }
}

export function getTierOrder(gameId: GameId) {
  return gameId === 'nte' ? TIER_ORDER_WITH_PLUS : TIER_ORDER;
}
