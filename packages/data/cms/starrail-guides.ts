// These stable routes are owned by the independent Star Rail publication.
// Keep ownership when a document is withdrawn; never restore an obsolete body.
export const STARRAIL_CMS_GUIDES = {
  'endgame-modes-guide': { zh: '虚构叙事与末日幻影：计分与队伍规划', en: 'Pure Fiction and Apocalyptic Shadow: Rules and Planning', ja: '虚構叙事と末日の幻影：ルールと編成計画' },
  'endgame-cycle-guide': { zh: '终局挑战：模式差异与周期规划', en: 'Endgame Modes and Rotation Planning', ja: '高難度モードと更新計画' },
  'farming-route-guide': { zh: '开拓力与材料刷取规划', en: 'Trailblaze Power and Material Farming', ja: '開拓力と素材周回計画' },
  'boss-strategy-guide': { zh: '历战余响：奖励次数与材料规划', en: 'Echo of War: Rewards and Material Planning', ja: '歴戦余韻：報酬回数と素材計画' },
  'planar-sphere-guide': { zh: '位面饰品：竞技场与龙骨效果核对', en: 'Planar Ornaments: Arena and Broken Keel', ja: '次元界オーナメント：競技場と竜骨' },
} as const;

export function isStarRailCmsGuide(slug: string): slug is keyof typeof STARRAIL_CMS_GUIDES {
  return Object.hasOwn(STARRAIL_CMS_GUIDES, slug);
}
