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

// NTE character exports
export {
  nteCharacters,
  getNteCharacterById,
  getNteCharacterName,
  getNteCharacterDescription,
  getNteCharacterImage,
  getNteCharacterTierReason,
} from './games/nte/characters';

// NTE weapon exports
export {
  nteWeapons,
  getNteWeaponById,
  getNteWeaponName,
  getNteWeaponEffect,
  getNteWeaponSource,
} from './games/nte/weapons';

// NTE material exports
export {
  nteMaterials,
  getNteMaterialName,
  getNteMaterialById,
} from './games/nte/items';

// NTE extras (disk sets, builds, character materials, images)
export {
  diskSets as nteDiskSets,
  builds as nteBuilds,
  characterMaterials as nteCharacterMaterials,
  getNteDiskSetName,
  getNteDiskSetDesc2pc,
  getNteDiskSetDesc4pc,
  getBuildsForCharacter,
  getMaterialsForCharacter,
  getCharacterImageUrl,
  getWeaponImageUrl,
} from './games/nte/extras';

// NTE redeem codes
export {
  redeemCodes as nteRedeemCodes,
  getActiveRedeemCodes,
  getRedeemCodeReward,
} from './games/nte/redeem-codes';
export type { NteRedeemCode } from './games/nte/redeem-codes';

// NTE gacha system
export {
  gachaBanners as nteGachaBanners,
  gachaFaqs as nteGachaFaqs,
  getGachaBannerName,
  getGachaBannerDesc,
  getGachaFaqQuestion,
  getGachaFaqAnswer,
} from './games/nte/gacha';
export type { NteGachaBanner, NteGachaFaq } from './games/nte/gacha';

// NTE anomalies (bosses)
export {
  anomalies as nteAnomalies,
  getAnomalyName,
  getAnomalyByType,
} from './games/nte/anomalies';
export type { NteAnomaly } from './games/nte/anomalies';

export type {
  NteCharacter,
  NteWeapon,
  NteMaterial,
  NteCharacterMaterials,
  NteDiskSet,
  NteBuild,
  NteSkillSet,
  NteSkillBase,
  NteActiveSkill,
  NteTeamComp,
  NteFaq,
  NteRecommendedBuild,
} from './games/nte/types';

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

import { characters as genshinCharacters, weapons as genshinWeapons, items as genshinItems, tierLists as genshinTierLists } from './games/genshin';
import { characters as starrailCharacters, weapons as starrailWeapons, items as starrailItems, tierLists as starrailTierLists } from './games/starrail';
import { characters as wuwaCharacters, weapons as wuwaWeapons, items as wuwaItems, tierLists as wuwaTierLists } from './games/wuwa';
import { characters as nteCharacters, weapons as nteWeapons, items as nteItems, tierLists as nteTierLists } from './games/nte';
