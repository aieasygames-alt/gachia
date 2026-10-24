import type { SupportedLocale } from '@gachia/core';
import rawCharacters from './raw-characters.json';

// URL continuity is not approval of the archived identity or asset fields.
export const rocoLegacyCharacterEntries = rawCharacters.map(({ id }) => ({
  id,
  contentReview: { status: 'needs_verification' as const, reviewedAt: '2026-10-24' },
}));

export const ROCO_CHARACTER_IDENTITY_REVIEW = {
  zh: {
    label: '历史条目',
    description: '此地址仅用于追溯本站历史记录，不代表官方角色身份或实装确认。旧名称、译名、图片、属性、稀有度及编号未完成独立国际服核验，现不再作为角色资料展示。图片来源、对应身份与使用权也未核实；不提供替代画像、技能、数值或培养建议。缺少依据不等于角色不存在或游戏取消。',
    portrait: '形象待核实',
    unverified: '待核实',
  },
  en: {
    label: 'Legacy entry',
    description: 'This URL traces a historical site record, not a confirmed official character or implementation. Earlier names, translations, artwork, elements, rarity and numbers lack independent global verification and are no longer presented as character facts. Image provenance, identity and usage rights are also unverified. No substitute portrait, skills, stats or investment advice is provided. Missing evidence does not establish nonexistence or cancellation.',
    portrait: 'Appearance unverified',
    unverified: 'Unverified',
  },
  ja: {
    label: '過去の項目',
    description: 'このURLは本站の過去の記録を追跡するためのもので、公式キャラの同一性や実装の確認ではありません。旧名称、翻訳、画像、属性、レアリティ、番号は独立した国際版の確認がなく、キャラ資料としての表示を取りやめました。画像の出典、同一性、利用権も未確認です。代替画像、スキル、値、育成推奨は掲載しません。根拠不足は不存在や中止の証明ではありません。',
    portrait: '外見未確認',
    unverified: '未確認',
  },
} satisfies Record<SupportedLocale, { label: string; description: string; portrait: string; unverified: string }>;

export function getRocoLegacyCharacterName(id: string, locale: SupportedLocale) {
  return `${ROCO_CHARACTER_IDENTITY_REVIEW[locale].label} · ${id}`;
}

export function getRocoLegacyCharacterById(id: string) {
  return rocoLegacyCharacterEntries.find(entry => entry.id === id);
}
