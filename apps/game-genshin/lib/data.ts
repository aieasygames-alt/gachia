import { artifactSets, getArtifactSetById, getArtifactSetDesc2pc, getArtifactSetDesc4pc, getArtifactSetName } from '@gachia/data/games/genshin/artifacts';
import { genshinCharacterSummaries, getGenshinCharacterSummaryImage, getGenshinCharacterSummaryName } from '@gachia/data/games/genshin/character-summaries';
import { genshinCharacters, getGenshinCharacterById, getGenshinCharacterDescription, getGenshinCharacterImage, getGenshinCharacterName } from '@gachia/data/games/genshin/characters';
import { genshinGuides, getGuideById, getGuideContent, getGuideSummary, getGuideTitle } from '@gachia/data/games/genshin/guides';
import { genshinMaterials, getGenshinMaterialById, getGenshinMaterialName } from '@gachia/data/games/genshin/items';
import { redeemCodes, getActiveRedeemCodes, getRedeemCodeReward } from '@gachia/data/games/genshin/redeem-codes';
import { genshinWeapons, getGenshinWeaponById, getGenshinWeaponEffect, getGenshinWeaponName, getGenshinWeaponSource } from '@gachia/data/games/genshin/weapons';

export const versionDecisionRoute = [
  {
    id: 'live-status',
    href: 'redeem-codes',
    title: { zh: '先核对实时状态', en: 'Check live status first', ja: 'まず最新状態を確認' },
    summary: { zh: '确认服务器、当前版本、活动祈愿、兑换码与活动是否仍有效；页面历史记录不能替代游戏内状态。', en: 'Confirm server, current version, event wishes, codes, and events are still active; historical entries do not replace in-game status.', ja: 'サーバー、現行バージョン、イベント祈願、コード、イベントが有効か確認します。履歴ページはゲーム内状態を置き換えません。' },
  },
  {
    id: 'banner-and-budget',
    href: 'gacha',
    title: { zh: '再确认卡池与预算', en: 'Then confirm banners and budget', ja: '次にバナーと予算を確認' },
    summary: { zh: '记录角色与武器祈愿的时间、抽数、保底、定轨与原石储备，分别保留当前可用与未来版本预算。', en: 'Record character and weapon banner timing, pulls, pity, pathing, and Primogems; keep current spendable and future reserves separate.', ja: 'キャラ・武器バナーの期間、回数、天井、定軌、原石を記録し、現在使う分と今後のための予備を分けます。' },
  },
  {
    id: 'target-and-progression',
    href: 'characters',
    title: { zh: '最后规划目标培养', en: 'Plan target progression last', ja: '最後に目標育成を計画' },
    summary: { zh: '只有在目标与预算可行后，才进入角色、武器、圣遗物、队伍、材料与地图资料，避免为未确认目标预投入资源。', en: 'Only after target and budget are viable should you open character, weapon, artifact, team, material, and map references.', ja: '目標と予算が実行可能になってから、キャラ、武器、聖遺物、編成、素材、マップ資料を確認します。未確定の目標へ先に資源を入れません。' },
  },
] as const;

export {
  artifactSets, genshinCharacterSummaries, genshinCharacters, genshinGuides, genshinMaterials, genshinWeapons, redeemCodes,
  getActiveRedeemCodes, getArtifactSetById, getArtifactSetDesc2pc, getArtifactSetDesc4pc, getArtifactSetName,
  getGenshinCharacterById, getGenshinCharacterDescription, getGenshinCharacterImage, getGenshinCharacterName,
  getGenshinCharacterSummaryImage, getGenshinCharacterSummaryName, getGenshinMaterialById, getGenshinMaterialName,
  getGuideById, getGuideContent, getGuideSummary, getGuideTitle, getGenshinWeaponById, getGenshinWeaponEffect,
  getGenshinWeaponName, getGenshinWeaponSource, getRedeemCodeReward,
};
