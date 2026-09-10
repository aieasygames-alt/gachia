import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { gameName } from '@/lib/data';

const pages = [
  ['characters', { zh: '角色', en: 'Characters', ja: 'キャラクター' }],
  ['weapons', { zh: '武器', en: 'Weapons', ja: '武器' }],
  ['guides', { zh: '攻略', en: 'Guides', ja: '攻略' }],
  ['kibo', { zh: 'Kibo 图鉴', en: 'Kibo', ja: 'キボ' }],
  ['world', { zh: '世界', en: 'World', ja: '世界' }],
  ['tier-list', { zh: '强度参考', en: 'Tier List', ja: 'Tier リスト' }],
  ['redeem-codes', { zh: '兑换码', en: 'Codes', ja: '交換コード' }],
] as const;

export function GameNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  return <header className="site-bar"><div className="site-bar__inner"><Link className="brand" href={`/${locale}/azur-promilia`}>Gachia · {gameName(locale)}</Link><nav className="nav" aria-label={`${gameName(locale)} navigation`}>{pages.map(([page, labels]) => <Link aria-current={current === page ? 'page' : undefined} className={current === page ? 'nav__link--current' : undefined} key={page} href={`/${locale}/azur-promilia/${page}`}>{labels[locale]}</Link>)}</nav></div></header>;
}
