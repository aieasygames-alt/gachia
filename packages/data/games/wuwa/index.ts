import type { Character, Weapon, Item, TierList } from '@gachia/core';

export { characters, wuwaCharacters, getWuWaCharacterById, getWuWaCharacterName, getWuWaCharacterDescription, getWuWaCharacterImage } from './characters';
export { weapons, wuwaWeapons, getWuWaWeaponById, getWuWaWeaponName, getWuWaWeaponEffect, getWuWaWeaponSource } from './weapons';
export { items, wuwaMaterials, getWuWaMaterialName, getWuWaMaterialById } from './items';
export { regions, getRegionName, getRegionDescription, getRegionById } from './regions';
export type { WuWaRegion } from './regions';
export { wuwaGuides, getGuideTitle, getGuideContent, getGuideSummary, getGuideCategory, getGuideCategories, getGuidesByCategory, getGuideById, getGuideSlugs, getGuideFaqQuestion, getGuideFaqAnswer, WUWA_GUIDE_CATEGORIES } from './guides';
export type { WuWaGuide, WuWaGuideFaq } from './guides';
export { echoSets, getEchoSetName, getEchoSetDesc2pc, getEchoSetDesc5pc, getEchoSetById } from './echoes';

export const tierLists: TierList[] = [];
