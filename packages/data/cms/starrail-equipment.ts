// Route ownership is explicit: withdrawal must never restore a legacy entry.
export const STARRAIL_CMS_EQUIPMENT = {
  weapons: {
    'when-the-first-aha-rang-out': 'when-the-first-aha-rang-out',
    'welcome-to-the-galactic-city': 'welcome-to-the-galactic-city',
    'dazzling-world': 'dazzling-world',
    'when-she-decided-to-see': 'when-she-decided-to-see',
    'trend-of-the-universal-market': 'trend-of-the-universal-market',
    'she-already-shut-her-eyes': 'she-already-shut-her-eyes',
    'geniuses-repose': 'geniuses-repose',
    'shadowed-by-night': 'shadowed-by-night',
    'along-the-passing-shore': 'along-the-passing-shore',
    'brighter-than-the-sun': 'brighter-than-the-sun',
    'before-dawn': 'before-dawn',
    'indelible-promise': 'indelible-promise',
    'shattered-home': 'shattered-home',
    'fine-fruit': 'fine-fruit',
    'day-one-of-my-new-life': 'day-one-of-my-new-life',
  },
  artifacts: { 'gods-momentary-bliss': 'gods-momentary-bliss', 'subspace-sanctuary': 'subspace-sanctuary' },
} as const;
export type StarRailEquipmentCategory = keyof typeof STARRAIL_CMS_EQUIPMENT;
// Historical URLs are redirects, never independent publication identities.
export const STARRAIL_CMS_WEAPON_ALIASES = {
  'welcome-to-the-cosmic-city': 'welcome-to-the-galactic-city',
} as const;
export function starRailCmsEquipmentCanonicalId(category: string, id: string): string | undefined {
  if (category === 'weapons' && Object.hasOwn(STARRAIL_CMS_WEAPON_ALIASES, id)) {
    return STARRAIL_CMS_WEAPON_ALIASES[id as keyof typeof STARRAIL_CMS_WEAPON_ALIASES];
  }
  return Object.hasOwn(STARRAIL_CMS_EQUIPMENT, category) && Object.hasOwn(STARRAIL_CMS_EQUIPMENT[category as StarRailEquipmentCategory], id) ? id : undefined;
}
export function isStarRailCmsEquipment(category: string, id: string): category is StarRailEquipmentCategory {
  return starRailCmsEquipmentCanonicalId(category, id) !== undefined;
}
