import type { Character, Weapon, Item, TierList, GameId } from '@gachia/core';

// NTE guide exports
export {
  guides as nteGuides,
  getGuideTitle,
  getGuideContent,
  getGuideSummary,
  getGuideCategory,
  getGuideFaqQuestion,
  getGuideFaqAnswer,
  getGuideCategories,
  getGuidesByCategory,
  getGuideById,
  getGuideSlugs,
  NTE_GUIDE_CATEGORIES,
} from './games/nte/guides';
export type { NteGuide, NteGuideFaq } from './games/nte/guides';

// --- Data Access Helpers ---

export interface GameData {
  characters: Character[];
  weapons: Weapon[];
  items: Item[];
  tierLists: TierList[];
}

export function getGameData(gameId: GameId): GameData {
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
  }
}

// Placeholder arrays — will be populated per game module
import { characters as genshinCharacters, weapons as genshinWeapons, items as genshinItems, tierLists as genshinTierLists } from './games/genshin';
import { characters as starrailCharacters, weapons as starrailWeapons, items as starrailItems, tierLists as starrailTierLists } from './games/starrail';
import { characters as wuwaCharacters, weapons as wuwaWeapons, items as wuwaItems, tierLists as wuwaTierLists } from './games/wuwa';
import { characters as nteCharacters, weapons as nteWeapons, items as nteItems, tierLists as nteTierLists } from './games/nte';
