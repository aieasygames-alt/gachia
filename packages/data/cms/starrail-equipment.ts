// Route ownership is explicit: withdrawal must never restore a legacy entry.
export const STARRAIL_CMS_EQUIPMENT = {
  weapons: {
    'when-the-first-aha-rang-out': 'when-the-first-aha-rang-out',
    'welcome-to-the-galactic-city': 'welcome-to-the-galactic-city',
    'dazzling-world': 'dazzling-world',
    'when-she-decided-to-see': 'when-she-decided-to-see',
    'trend-of-the-universal-market': 'trend-of-the-universal-market',
    'she-already-shut-her-eyes': 'she-already-shut-her-eyes',
  },
  artifacts: { 'gods-momentary-bliss': 'gods-momentary-bliss', 'subspace-sanctuary': 'subspace-sanctuary' },
} as const;
export type StarRailEquipmentCategory = keyof typeof STARRAIL_CMS_EQUIPMENT;
export function isStarRailCmsEquipment(category: string, id: string): category is StarRailEquipmentCategory {
  return Object.hasOwn(STARRAIL_CMS_EQUIPMENT, category) && Object.hasOwn(STARRAIL_CMS_EQUIPMENT[category as StarRailEquipmentCategory], id);
}
