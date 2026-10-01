import type { SupportedLocale } from '@gachia/core';
import { SharedGameHeader, createSharedGameHeaderModel, headerGameName } from '@gachia/ui';

const pages = [
  ['characters', { zh: '角色', en: 'Characters', ja: 'キャラクター' }],
  ['weapons', { zh: '武器', en: 'Weapons', ja: '武器' }],
  ['guides', { zh: '攻略', en: 'Guides', ja: '攻略' }],
  ['guides/kibo-battle-and-ecology', { zh: '旅迹专题', en: 'Travel Trace', ja: '旅跡特集' }],
  ['travel-trace', { zh: '测试核验', en: 'Test checks', ja: 'テスト確認' }],
  ['kibo', { zh: 'Kibo 图鉴', en: 'Kibo', ja: 'キボ' }],
  ['systems', { zh: '系统词典', en: 'Systems', ja: 'システム' }],
  ['world', { zh: '世界', en: 'World', ja: '世界' }],
  ['redeem-codes', { zh: '兑换码', en: 'Codes', ja: '交換コード' }],
  ['planner', { zh: '养成规划', en: 'Planner', ja: '育成計画' }],
  ['version', { zh: '版本', en: 'Version', ja: 'バージョン' }],
] as const;

export function GameNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  const header = createSharedGameHeaderModel({
    gameId: 'azur-promilia',
    locale,
    localeLinks: (['zh', 'en', 'ja'] as const).map((target) => ({ href: `/${target}/azur-promilia${current ? `/${current}` : ''}`, label: target === 'zh' ? '中文' : target === 'ja' ? 'JA' : 'EN', current: target === locale })),
    sectionLabel: 'Azur Promilia navigation',
    sectionLinks: [{ href: `/${locale}/azur-promilia`, label: headerGameName('azur-promilia', locale), current: !current }, ...pages.map(([id, label]) => ({ href: `/${locale}/azur-promilia/${id}`, label: label[locale], current: current === id }))],
  });
  return <SharedGameHeader header={header} />;
}
