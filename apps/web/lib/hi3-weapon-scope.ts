import type { SupportedLocale } from '@gachia/core';

export const hi3WeaponScope: Record<SupportedLocale, string> = {
  zh: '本页是 Global 英文公告资料摘要，不代表当前客户端效果或可用状态已核实。中文与日文名称沿用现有资料，正式本地化名称尚待核对；名称、星级和版本标签不是当前获取状态证明。',
  en: 'Global English announcement summary, not verified current client effects or availability. Existing Chinese and Japanese labels await official localization checks. Names, rarity and version labels do not prove current availability.',
  ja: 'Global英語版の告知資料の概要です。現在のクライアントでの効果や利用可能な状態は未確認です。既存の中国語・日本語名称は公式表記との照合待ちです。名称・レア度・バージョン表記は現在の入手可否を証明しません。',
};

export function hi3WeaponMetadata(locale: SupportedLocale, name?: string) {
  const title = { zh: '崩坏3武器公告摘要', en: 'HI3 Weapon Announcement Summary', ja: '崩壊3rd 武器告知の概要' }[locale];
  // Put the boundary first; never truncate it behind a long entity name or body.
  const description = {
    zh: 'Global 英文公告摘要；当前客户端效果与可用状态未核验，中日文正式名称待核对。仅整理公告中的武器资料，不提供已验证的技能数值、配装或获取保证。',
    en: 'Global English notice summary. Current effects, availability and localized names are unverified. Announcement data only; no verified stats or builds.',
    ja: 'Global英語版の告知概要。現在の効果・入手可否、公式の中国語・日本語名称は未確認です。告知資料のみを整理し、検証済みの性能数値や育成・入手を保証するものではありません。',
  }[locale];
  return { title: name ? `${title} — ${name}` : title, description };
}

export const hi3WeaponSearchScope: Record<SupportedLocale, string> = {
  zh: '公告资料；名称及当前效果/可用状态待核验',
  en: 'Announcement data; names and current effects/availability unverified',
  ja: '告知資料：名称・現在の効果・入手可否は未確認',
};
