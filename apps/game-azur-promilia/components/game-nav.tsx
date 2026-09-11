import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { createSharedHeaderModel, headerGameName } from '@gachia/ui';

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
  const header = createSharedHeaderModel(locale);
  return <header className="gachia-header"><div className="gachia-header__top"><div className="gachia-header__container"><Link className="gachia-header__brand" href={`/${locale}`}><span className="gachia-header__logo">G</span><span>Gachia</span></Link><nav className="gachia-header__games" aria-label="Game navigation">{header.featuredGames.map((game) => <Link key={game.id} href={`/${locale}/${game.id}`} className="gachia-header__game-link">{game.label}</Link>)}<Link href={`https://gachia.com/${locale}/games`} className="gachia-header__all-link">{header.moreGamesLabel}</Link></nav><div className="gachia-header__actions"><span className="gachia-header__search-placeholder" aria-hidden="true">⌕ {locale === 'zh' ? '搜索' : locale === 'ja' ? '検索' : 'Search'}</span><div className="gachia-header__locale">{header.languages.map((target) => <Link key={target.locale} href={`/${target.locale}/azur-promilia${current ? `/${current}` : ''}`} aria-current={target.locale === locale ? 'page' : undefined}>{target.label}</Link>)}</div></div></div></div><div className="gachia-header__section-wrap"><nav className="gachia-header__section" aria-label="Azur Promilia navigation"><Link className={!current ? 'gachia-header__section-link--current' : undefined} href={`/${locale}/azur-promilia`}>{headerGameName('azur-promilia', locale)}</Link>{pages.map(([id, label]) => <Link key={id} href={`/${locale}/azur-promilia/${id}`} className={current === id ? 'gachia-header__section-link--current' : undefined}>{label[locale]}</Link>)}</nav></div></header>;
}
