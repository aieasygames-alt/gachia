import type { SupportedLocale } from '@gachia/core';

const pending: Record<SupportedLocale, string> = {
  zh: '资料标签，公告未核实',
  en: 'Existing label; not verified by the announcement',
  ja: '既存の分類・告知では未確認',
};

// The saved Global announcement explicitly identifies only Sparkler's rank/type.
export function hi3WeaponFieldLabels(id: string, rank: string, type: string, locale: SupportedLocale) {
  const supported = id === 'volatile-sparkler' && rank === '4-star' && type === 'Drive Core';
  return {
    rank: supported ? rank : `${rank} (${pending[locale]})`,
    type: supported ? type : `${type} (${pending[locale]})`,
    // Decorative stars otherwise turn an unverified source label into an assertion.
    rarity: supported ? 4 : 0,
  };
}
