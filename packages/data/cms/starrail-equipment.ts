// Route ownership is explicit: withdrawal must never restore a legacy entry.
export const STARRAIL_CMS_EQUIPMENT = {
  weapons: { 'when-the-first-aha-rang-out': 'when-the-first-aha-rang-out' },
  artifacts: { 'gods-momentary-bliss': 'gods-momentary-bliss', 'subspace-sanctuary': 'subspace-sanctuary' },
} as const;
export type StarRailEquipmentCategory = keyof typeof STARRAIL_CMS_EQUIPMENT;
export function isStarRailCmsEquipment(category: string, id: string): category is StarRailEquipmentCategory {
  return Object.hasOwn(STARRAIL_CMS_EQUIPMENT, category) && Object.hasOwn(STARRAIL_CMS_EQUIPMENT[category as StarRailEquipmentCategory], id);
}
