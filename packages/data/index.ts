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

// NTE regions
export {
  regions as nteRegions,
  getRegionName as getNteRegionName,
  getRegionDescription as getNteRegionDescription,
  getRegionById as getNteRegionById,
} from './games/nte/regions';
export type { NteRegion } from './games/nte/types';

// ============================================================
// Genshin Impact exports
// ============================================================

// Genshin character exports
export {
  genshinCharacters,
  getGenshinCharacterById,
  getGenshinCharacterName,
  getGenshinCharacterDescription,
  getGenshinCharacterImage,
  getGenshinCharacterTierReason,
} from './games/genshin/characters';

// Genshin weapon exports
export {
  genshinWeapons,
  getGenshinWeaponById,
  getGenshinWeaponName,
  getGenshinWeaponEffect,
  getGenshinWeaponSource,
} from './games/genshin/weapons';

// Genshin material exports
export {
  genshinMaterials,
  getGenshinMaterialName,
  getGenshinMaterialById,
} from './games/genshin/items';

// Genshin artifact exports
export {
  artifactSets as genshinArtifactSets,
  getArtifactSetName,
  getArtifactSetDesc2pc,
  getArtifactSetDesc4pc,
  getArtifactSetById,
} from './games/genshin/artifacts';

// Genshin extras (character materials)
export {
  characterMaterials as genshinCharacterMaterials,
  getMaterialsForCharacter as getGenshinMaterialsForCharacter,
} from './games/genshin/extras';

// Genshin regions
export {
  regions as genshinRegions,
  getRegionName as getGenshinRegionName,
  getRegionDescription as getGenshinRegionDescription,
  getRegionById as getGenshinRegionById,
} from './games/genshin/regions';
export type { GenshinRegion } from './games/genshin/regions';

// Genshin redeem codes
export {
  redeemCodes as genshinRedeemCodes,
  getActiveRedeemCodes as getGenshinActiveRedeemCodes,
  getRedeemCodeReward as getGenshinRedeemCodeReward,
} from './games/genshin/redeem-codes';
export type { GenshinRedeemCode } from './games/genshin/redeem-codes';

// Genshin interactive map data
export {
  genshinMapData,
  GENSHIN_SUB_MAPS,
  getCategoryName,
  getMarkerName,
  getMarkerDescription,
} from './games/genshin/map-data';
export type { MapCategory, MapMarker, GameMapData, SubMapConfig } from './games/genshin/map-data';

// Genshin guides
export {
  genshinGuides,
  getGuideTitle as getGenshinGuideTitle,
  getGuideContent as getGenshinGuideContent,
  getGuideSummary as getGenshinGuideSummary,
  getGuideCategory as getGenshinGuideCategory,
  getGuideCategories as getGenshinGuideCategories,
  getGuidesByCategory as getGenshinGuidesByCategory,
  getGuideById as getGenshinGuideById,
  getGuideSlugs as getGenshinGuideSlugs,
  getGuideFaqQuestion as getGenshinGuideFaqQuestion,
  getGuideFaqAnswer as getGenshinGuideFaqAnswer,
  GENSHIN_GUIDE_CATEGORIES,
} from './games/genshin/guides';
export type { GenshinGuide, GenshinGuideFaq } from './games/genshin/guides';

export type {
  GenshinCharacter,
  GenshinWeapon,
  GenshinMaterial,
  GenshinArtifactSet,
  GenshinCharacterMaterials,
  GenshinSkillSet,
  GenshinSkillBase,
  GenshinActiveSkill,
  GenshinConstellation,
  GenshinTeamComp,
  GenshinFaq,
  GenshinRecommendedBuild,
} from './games/genshin/types';

// ============================================================
// Honkai: Star Rail exports
// ============================================================

// StarRail character exports
export {
  starrailCharacters,
  getStarRailCharacterById,
  getStarRailCharacterName,
  getStarRailCharacterDescription,
  getStarRailCharacterImage,
  getStarRailCharacterTierReason,
} from './games/starrail/characters';

// StarRail light cone exports
export {
  starrailLightCones,
  getStarRailLightConeById,
  getStarRailLightConeName,
  getStarRailLightConeEffect,
  getStarRailLightConeSource,
} from './games/starrail/weapons';

// StarRail material exports
export {
  starrailMaterials,
  getStarRailMaterialName,
  getStarRailMaterialById,
} from './games/starrail/items';

// StarRail relic exports
export {
  relicSets as starrailRelicSets,
  getRelicSetName as getStarRailRelicSetName,
  getRelicSetDesc2pc as getStarRailRelicSetDesc2pc,
  getRelicSetDesc4pc as getStarRailRelicSetDesc4pc,
  getRelicSetById as getStarRailRelicSetById,
  getCavernRelics as getStarRailCavernRelics,
  getPlanarOrnaments as getStarRailPlanarOrnaments,
} from './games/starrail/relics';

// StarRail extras (character materials)
export {
  characterMaterials as starrailCharacterMaterials,
  getMaterialsForCharacter as getStarRailMaterialsForCharacter,
} from './games/starrail/extras';

// StarRail redeem codes
export {
  redeemCodes as starrailRedeemCodes,
  getActiveRedeemCodes as getStarRailActiveRedeemCodes,
  getRedeemCodeReward as getStarRailRedeemCodeReward,
} from './games/starrail/redeem-codes';
export type { StarRailRedeemCode } from './games/starrail/redeem-codes';

// StarRail regions
export {
  regions as starrailRegions,
  getRegionName as getStarRailRegionName,
  getRegionDescription as getStarRailRegionDescription,
  getRegionById as getStarRailRegionById,
} from './games/starrail/regions';

// StarRail guides
export {
  starrailGuides,
  getGuideTitle as getStarRailGuideTitle,
  getGuideContent as getStarRailGuideContent,
  getGuideSummary as getStarRailGuideSummary,
  getGuideCategory as getStarRailGuideCategory,
  getGuideCategories as getStarRailGuideCategories,
  getGuidesByCategory as getStarRailGuidesByCategory,
  getGuideById as getStarRailGuideById,
  getGuideSlugs as getStarRailGuideSlugs,
  getGuideFaqQuestion as getStarRailGuideFaqQuestion,
  getGuideFaqAnswer as getStarRailGuideFaqAnswer,
  STARRAIL_GUIDE_CATEGORIES,
} from './games/starrail/guides';
export type { StarRailGuide, StarRailGuideFaq } from './games/starrail/guides';

export type {
  StarRailCharacter,
  StarRailLightCone,
  StarRailMaterial,
  StarRailRelicSet,
  StarRailCharacterMaterials,
  StarRailRegion,
  StarRailSkillSet,
  StarRailSkillBase,
  StarRailActiveSkill,
  StarRailEidolon,
  StarRailTeamComp,
  StarRailFaq,
  StarRailRecommendedBuild,
} from './games/starrail/types';

// ============================================================
// Wuthering Waves exports
// ============================================================

// WuWa character exports
export {
  wuwaCharacters,
  getWuWaCharacterById,
  getWuWaCharacterName,
  getWuWaCharacterDescription,
  getWuWaCharacterImage,
  getWuWaCharacterMaterials,
} from './games/wuwa/characters';

// WuWa weapon exports
export {
  wuwaWeapons,
  getWuWaWeaponById,
  getWuWaWeaponName,
  getWuWaWeaponEffect,
  getWuWaWeaponSource,
} from './games/wuwa/weapons';

// WuWa material exports
export {
  wuwaMaterials,
  getWuWaMaterialName,
  getWuWaMaterialById,
} from './games/wuwa/items';

export type {
  WuWaCharacter,
  WuWaWeapon,
  WuWaMaterial,
  WuWaSkillSet,
  WuWaSkillBase,
  WuWaActiveSkill,
  WuWaSequence,
} from './games/wuwa/types';

// WuWa redeem codes
export {
  redeemCodes as wuwaRedeemCodes,
  getActiveRedeemCodes as getWuWaActiveRedeemCodes,
  getRedeemCodeReward as getWuWaRedeemCodeReward,
} from './games/wuwa/redeem-codes';
export type { WuWaRedeemCode } from './games/wuwa/redeem-codes';

// WuWa region exports
export {
  regions as wuwaRegions,
  getRegionName as getWuWaRegionName,
  getRegionDescription as getWuWaRegionDescription,
  getRegionById as getWuWaRegionById,
} from './games/wuwa/regions';
export type { WuWaRegion } from './games/wuwa/regions';

// WuWa guide exports
export {
  wuwaGuides,
  getGuideTitle as getWuWaGuideTitle,
  getGuideContent as getWuWaGuideContent,
  getGuideSummary as getWuWaGuideSummary,
  getGuideCategory as getWuWaGuideCategory,
  getGuideCategories as getWuWaGuideCategories,
  getGuidesByCategory as getWuWaGuidesByCategory,
  getGuideById as getWuWaGuideById,
  getGuideSlugs as getWuWaGuideSlugs,
  getGuideFaqQuestion as getWuWaGuideFaqQuestion,
  getGuideFaqAnswer as getWuWaGuideFaqAnswer,
  WUWA_GUIDE_CATEGORIES,
} from './games/wuwa/guides';
export type { WuWaGuide, WuWaGuideFaq } from './games/wuwa/guides';

// WuWa echo exports
export {
  echoSets as wuwaEchoSets,
  getEchoSetName as getWuWaEchoSetName,
  getEchoSetDesc2pc as getWuWaEchoSetDesc2pc,
  getEchoSetDesc5pc as getWuWaEchoSetDesc5pc,
  getEchoSetById as getWuWaEchoSetById,
} from './games/wuwa/echoes';

// ============================================================
// Zenless Zone Zero (ZZZ) exports
// ============================================================

// ZZZ character exports
export {
  zzzCharacters,
  getZzzCharacterById,
  getZzzCharacterName,
  getZzzCharacterDescription,
  getZzzCharacterImage,
  getZzzCharacterTierReason,
} from './games/zzz/characters';

// ZZZ weapon exports (W-Engines)
export {
  zzzWeapons,
  getZzzWeaponById,
  getZzzWeaponName,
  getZzzWeaponEffect,
  getZzzWeaponSource,
} from './games/zzz/weapons';

// ZZZ material exports
export {
  zzzMaterials,
  getZzzMaterialName,
  getZzzMaterialById,
} from './games/zzz/items';

// ZZZ redeem codes
export {
  redeemCodes as zzzRedeemCodes,
  getActiveRedeemCodes as getZzzActiveRedeemCodes,
  getRedeemCodeReward as getZzzRedeemCodeReward,
} from './games/zzz/redeem-codes';
export type { ZzzRedeemCode } from './games/zzz/redeem-codes';

// ZZZ drive disc exports
export {
  zzzDriveDiscs,
  getZzzDriveDiscName,
  getZzzDriveDiscDesc2pc,
  getZzzDriveDiscDesc4pc,
  getZzzDriveDiscById,
} from './games/zzz/drive-discs';

// ZZZ guide exports
export {
  zzzGuides,
  getZzzGuideTitle,
  getZzzGuideContent,
  getZzzGuideSummary,
  getZzzGuideCategory,
  getZzzGuideCategories,
  getZzzGuidesByCategory,
  getZzzGuideById,
  getZzzGuideSlugs,
  getZzzGuideFaqQuestion,
  getZzzGuideFaqAnswer,
  ZZZ_GUIDE_CATEGORIES,
} from './games/zzz/guides';

export type {
  ZzzCharacter,
  ZzzWeapon,
  ZzzMaterial,
  ZzzDriveDisc,
  ZzzSkillSet,
  ZzzSkillBase,
  ZzzActiveSkill,
  ZzzTeamComp,
  ZzzFaq,
  ZzzRecommendedBuild,
  ZzzMindscapeCinema,
} from './games/zzz/types';

export type { ZzzGuide, ZzzGuideFaq } from './games/zzz/guides';

// ============================================================
// 归环 (Guihuan) exports
// ============================================================

// Guihuan character exports
export {
  guihuanCharacters,
  getGuihuanCharacterById,
  getGuihuanCharacterName,
  getGuihuanCharacterDescription,
  getGuihuanCharacterImage,
  getGuihuanCharacterTierReason,
} from './games/guihuan/characters';

// Guihuan weapon exports
export {
  guihuanWeapons,
  getGuihuanWeaponById,
  getGuihuanWeaponName,
  getGuihuanWeaponEffect,
  getGuihuanWeaponSource,
} from './games/guihuan/weapons';

// Guihuan material exports
export {
  guihuanMaterials,
  getGuihuanMaterialName,
  getGuihuanMaterialById,
} from './games/guihuan/items';

// Guihuan guide exports
export {
  guihuanGuides,
  getGuihuanGuideTitle,
  getGuihuanGuideContent,
  getGuihuanGuideSummary,
  getGuihuanGuideCategory,
  getGuihuanGuideCategories,
  getGuihuanGuidesByCategory,
  getGuihuanGuideById,
  getGuihuanGuideSlugs,
  getGuihuanGuideFaqQuestion,
  getGuihuanGuideFaqAnswer,
  GUIHUAN_GUIDE_CATEGORIES,
} from './games/guihuan/guides';

export type {
  GuihuanCharacter,
  GuihuanWeapon,
  GuihuanMaterial,
  GuihuanSkillSet,
  GuihuanSkillBase,
  GuihuanActiveSkill,
  GuihuanTeamComp,
  GuihuanFaq,
  GuihuanRecommendedBuild,
} from './games/guihuan/types';

export type { GuihuanGuide, GuihuanGuideFaq } from './games/guihuan/guides';

// ============================================================
// 无限大 (Ananta) exports
// ============================================================

// Ananta character exports
export {
  anantaCharacters,
  getAnantaCharacterById,
  getAnantaCharacterName,
  getAnantaCharacterDescription,
  getAnantaCharacterImage,
  getAnantaCharacterTierReason,
} from './games/ananta/characters';

// Ananta weapon exports
export {
  anantaWeapons,
  getAnantaWeaponById,
  getAnantaWeaponName,
  getAnantaWeaponEffect,
  getAnantaWeaponSource,
} from './games/ananta/weapons';

// Ananta material exports
export {
  anantaMaterials,
  getAnantaMaterialName,
  getAnantaMaterialById,
} from './games/ananta/items';

// Ananta guide exports
export {
  anantaGuides,
  getAnantaGuideTitle,
  getAnantaGuideContent,
  getAnantaGuideSummary,
  getAnantaGuideCategory,
  getAnantaGuideCategories,
  getAnantaGuidesByCategory,
  getAnantaGuideById,
  getAnantaGuideSlugs,
  getAnantaGuideFaqQuestion,
  getAnantaGuideFaqAnswer,
  ANANTA_GUIDE_CATEGORIES,
} from './games/ananta/guides';

export type {
  AnantaCharacter,
  AnantaWeapon,
  AnantaMaterial,
  AnantaSkillSet,
  AnantaSkillBase,
  AnantaActiveSkill,
  AnantaTeamComp,
  AnantaFaq,
  AnantaRecommendedBuild,
} from './games/ananta/types';

export type { AnantaGuide, AnantaGuideFaq } from './games/ananta/guides';

// --- Material-Character Reverse Lookup ---
export { getCharactersNeedingMaterial, type MaterialCharacter } from './material-characters';

// --- Weapon-Character Reverse Lookup ---
export { getCharactersForWeapon, getRelatedWeapons } from './weapon-characters';

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
  }
}

import { characters as genshinCharacters, weapons as genshinWeapons, items as genshinItems, tierLists as genshinTierLists } from './games/genshin';
import { characters as starrailCharacters, weapons as starrailWeapons, items as starrailItems, tierLists as starrailTierLists } from './games/starrail/index';
import { characters as wuwaCharacters, weapons as wuwaWeapons, items as wuwaItems, tierLists as wuwaTierLists } from './games/wuwa';
import { characters as nteCharacters, weapons as nteWeapons, items as nteItems, tierLists as nteTierLists } from './games/nte';
import { characters as zzzCharacters, weapons as zzzWeapons, items as zzzItems, tierLists as zzzTierLists } from './games/zzz';
import { characters as guihuanCharacters, weapons as guihuanWeapons, items as guihuanItems, tierLists as guihuanTierLists } from './games/guihuan';
import { characters as anantaCharacters, weapons as anantaWeapons, items as anantaItems, tierLists as anantaTierLists } from './games/ananta';
