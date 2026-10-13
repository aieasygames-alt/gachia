import { FactError } from './facts.mjs';
import { fingerprint } from './revisions.mjs';

// Curated translations of one verified announcement statement, not official localization.
export const announcementDescriptions = Object.freeze({
  'vermillion-liuli': Object.freeze({
    description: 'Global 英文 v9.0 官方公告将 Divine Key Vermillion Liuli 列为 Fenghuang of Vicissitude 的推荐装备，并将 Vermillion Liuli: Full Burn 列为其 PRI-ARM 形态。这是公告声明，不代表已核实当前客户端的效果或可用状态。装备与角色名保留英文原文，不作为官方中文本地化名称。',
    descriptionEn: 'The Global English v9.0 announcement lists Divine Key Vermillion Liuli as recommended equipment for Fenghuang of Vicissitude and names Vermillion Liuli: Full Burn as its PRI-ARM form. This is an announcement statement, not verification of current client effects or availability.',
    descriptionJa: 'Global英語版のv9.0公式告知では、Divine Key Vermillion LiuliがFenghuang of Vicissitudeの推奨装備として、Vermillion Liuli: Full BurnがそのPRI-ARM形態として紹介されています。これは告知の記載であり、現在のクライアントでの効果や利用可能な状態を確認したものではありません。装備名とキャラクター名は英語原文のままで、公式の日本語名称を示すものではありません。',
  }),
  'vermillion-liuli-full-burn': Object.freeze({
    description: 'Global 英文 v9.0 官方公告将 Vermillion Liuli: Full Burn 列为 Divine Key Vermillion Liuli 的 PRI-ARM 形态；该装备为 Fenghuang of Vicissitude 的推荐装备。这是公告声明，不代表已核实当前客户端的效果或可用状态。装备与角色名保留英文原文，不作为官方中文本地化名称。',
    descriptionEn: 'The Global English v9.0 announcement lists Vermillion Liuli: Full Burn as the PRI-ARM form of Divine Key Vermillion Liuli, recommended equipment for Fenghuang of Vicissitude. This is an announcement statement, not verification of current client effects or availability.',
    descriptionJa: 'Global英語版のv9.0公式告知では、Vermillion Liuli: Full BurnがDivine Key Vermillion LiuliのPRI-ARM形態として紹介され、この装備はFenghuang of Vicissitudeの推奨装備とされています。これは告知の記載であり、現在のクライアントでの効果や利用可能な状態を確認したものではありません。装備名とキャラクター名は英語原文のままで、公式の日本語名称を示すものではありません。',
  }),
});

export function applyAnnouncementDescriptions(rows) {
  if (!Array.isArray(rows)) throw new FactError('Expected weapon array');
  const result = structuredClone(rows);
  for (const [id, fields] of Object.entries(announcementDescriptions)) {
    const matches = result.filter((row) => row?.id === id);
    if (matches.length !== 1) throw new FactError(`Expected exactly one weapon: ${id}`);
    Object.assign(matches[0], fields);
  }
  return result;
}

export function assertAnnouncementDescriptionDelta(before, after) {
  if (fingerprint(applyAnnouncementDescriptions(before)) !== fingerprint(after)) {
    throw new FactError('Only the two curated three-language description groups may change');
  }
}
